(function() {
  var topic = {
  id:"sd-case-ride-sharing", area:"sysdesign",
  title:"Case Study: Ride Sharing (Uber / Lyft)",
  tag:"Case Study", tags:["uber","lyft","geospatial","geohash","h3","matching","dispatch","websocket","surge pricing","location tracking"],
  concept:`**Requirements:** 5M trips/day, real-time driver location updates (every 4s), sub-5s match time, surge pricing.

**Core challenges:**
1. **Location tracking** — drivers send GPS coordinates every 4 seconds. ~500K active drivers = 125K updates/second.
2. **Nearby driver search** — given rider location, find available drivers within 5km in <100ms.
3. **Matching** — assign the best driver (ETA + rating + car type) to rider.
4. **Real-time communication** — push trip status updates to both rider and driver.

**Geospatial indexing:**
- **Geohash** — encode lat/lng into a base32 string. Nearby locations share a prefix. 7-char geohash ≈ 150m × 150m cell. Query: find drivers in same geohash + 8 neighbors.
- **H3 (Uber's hexagonal grid)** — hexagonal cells at multiple resolutions. Hexagons tile uniformly — no distortion at cell boundaries. Used for surge pricing regions.
- **S2 (Google)** — spherical geometry, quadtree-based. Used by Google Maps.
- **PostGIS / Redis GEOADD** — store points, radius search with GEORADIUS command.

**Architecture:**
- **Location service** — receives WebSocket/HTTP stream of driver positions. Updates Redis GEOADD (lng,lat per driver). Each driver position = 1 Redis geo write/4s.
- **Supply service** — GEORADIUS search on Redis. Returns drivers within 5km. Filter: available, correct car type, not in trip.
- **Dispatch/matching** — ranks candidates by ETA (computed by routing engine). Sends offer to best driver. Driver accepts/declines in 10s. On decline, next candidate offered.
- **Trip service** — manages trip state machine (REQUESTED → ACCEPTED → PICKUP → IN_PROGRESS → COMPLETED).
- **Surge pricing** — H3 hexagon aggregation. If demand/supply ratio > threshold in a hex → surge multiplier applied.

**Communication:** WebSocket for real-time push (driver location on map). SSE as fallback.`,
  why:`Uber's architecture covers geospatial, real-time matching, state machines, and event-driven design — touching nearly every system design concept in one problem.`,
  example:{
    language:"python",
    code:`# Location service — FastAPI + Redis Geo
from fastapi import FastAPI, WebSocket
from redis.asyncio import Redis
import asyncio, json

app = FastAPI()
redis = Redis(host='redis-cluster', decode_responses=True)

@app.websocket("/driver/location")
async def driver_location_ws(ws: WebSocket, driver_id: str):
    await ws.accept()
    try:
        while True:
            data = await ws.receive_json()
            lat, lng, status = data['lat'], data['lng'], data['status']

            if status == 'AVAILABLE':
                # GEOADD: store driver position in Redis geo index
                await redis.geoadd('drivers:available', {driver_id: (lng, lat)})
                # Also store metadata
                await redis.hset(f'driver:{driver_id}',
                    mapping={'lat': lat, 'lng': lng,
                             'updated': data['timestamp'],
                             'rating': data.get('rating', 4.5)})
            else:
                # Remove from available pool
                await redis.zrem('drivers:available', driver_id)

    except Exception:
        await redis.zrem('drivers:available', driver_id)

# Supply service — find nearby drivers
@app.get("/supply/nearby")
async def nearby_drivers(lat: float, lng: float, radius_km: float = 5.0):
    # GEORADIUS: find all drivers within radius
    drivers = await redis.georadius(
        'drivers:available', lng, lat,
        radius_km, unit='km',
        withcoord=True, withdist=True,
        sort='ASC', count=20)

    results = []
    for driver_id, dist, coords in drivers:
        meta = await redis.hgetall(f'driver:{driver_id}')
        results.append({
            'driverId': driver_id,
            'distanceKm': dist,
            'lat': coords[1], 'lng': coords[0],
            'rating': float(meta.get('rating', 4.5))
        })
    return results

# Dispatch — Saga-like matching
@app.post("/trips/match")
async def match_trip(rider_lat: float, rider_lng: float, trip_id: str):
    candidates = await nearby_drivers(rider_lat, rider_lng, radius_km=5.0)

    for candidate in candidates[:5]:  # try top 5
        driver_id = candidate['driverId']

        # Atomic: claim driver (remove from available + mark as pending)
        removed = await redis.zrem('drivers:available', driver_id)
        if removed == 0: continue  # already taken by another request

        # Send offer to driver via WebSocket/push notification
        await redis.publish(f'driver:{driver_id}:offers',
                           json.dumps({'tripId': trip_id, 'ttl': 10}))

        # Wait for acceptance (10s timeout)
        response = await wait_for_driver_response(driver_id, trip_id, timeout=10)
        if response == 'ACCEPTED':
            return {'tripId': trip_id, 'driverId': driver_id, 'status': 'MATCHED'}

        # Declined — put driver back in available pool
        meta = await redis.hgetall(f'driver:{driver_id}')
        await redis.geoadd('drivers:available',
                          {driver_id: (float(meta['lng']), float(meta['lat']))})

    raise HTTPException(503, "No drivers available")`,
    notes:"GEORADIUS is O(N+log M) where N is elements within radius. For 500K drivers in city, narrow radius (5km) returns ~200 drivers — fast enough for real-time matching."
  },
  interview:[
    {question:"How would you design the surge pricing system?",
     answer:`**Goal:** Dynamically increase prices in areas where demand > supply to incentivise drivers.\n\n**Design:**\n1. **H3 hexagonal grid** — divide city into ~1km hexagonal cells (resolution 8). Hexagons tile uniformly — no distortion.\n2. **Demand signal** — count trip requests per cell in last 5 minutes (Redis ZADD with sliding window).\n3. **Supply signal** — count available drivers per cell (Redis GEORADIUS count per cell centroid).\n4. **Surge multiplier** — if demand/supply ratio > 2 → 1.5× surge. > 5 → 2× surge. Capped at 3× (brand protection).\n5. **Cache + refresh** — surge multipliers computed every 60s by a cron job. Cached in Redis per H3 cell ID.\n6. **Display** — rider app fetches surge multiplier for their H3 cell before booking. Shows surge warning.\n7. **Feedback loop** — higher prices → more drivers enter area → supply increases → surge decreases (Uber intentionally shows driver earnings in surge zones).`,
     followUps:["How do you prevent drivers from colluding to artificially create surge?","How would you handle the matching algorithm when multiple riders request simultaneously?"]
    }
  ],
  tradeoffs:{
    pros:["Redis GEORADIUS: sub-millisecond nearby driver search","Geohash/H3: efficient spatial partitioning","WebSocket: real-time location updates without polling overhead"],
    cons:["Redis is in-memory: 500K driver positions × 64 bytes = 32MB — easily fits but requires HA","WebSocket: sticky sessions or pub-sub backplane required","Matching race conditions: need atomic claim (ZREM) to prevent double-assignment"],
    when:"This pattern (Redis geo + WebSocket + event-driven matching) applies to any real-time location-aware service: food delivery, logistics tracking, peer-to-peer marketplace."
  },
  visual: function(mount) {
    mount.innerHTML = '';
    var W = 460, H = 320;
    var canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    canvas.style.cssText = 'width:100%;max-width:460px;border-radius:8px;background:#0d1117;display:block;margin:0 auto';
    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin-top:8px';
    var btnStyle = 'padding:5px 14px;border-radius:6px;border:1px solid #30363d;background:#21262d;color:#e6edf3;cursor:pointer;font-size:12px';
    mount.appendChild(canvas);
    mount.appendChild(btnRow);
    var ctx = canvas.getContext('2d');

    var GW = 9, GH = 8; // grid cells
    var CW = W / GW, CH = (H - 54) / GH; // cell size
    var GRIDTOP = 28;

    // Drivers: {gx, gy, dx, dy (drift velocity), matched, highlight, route}
    var drivers = [
      {gx:1.5, gy:1.5, dx:0.004, dy:0.002, matched:false, highlight:false},
      {gx:4.2, gy:2.1, dx:-0.003, dy:0.005, matched:false, highlight:false},
      {gx:6.8, gy:1.8, dx:0.002, dy:-0.004, matched:false, highlight:false},
      {gx:2.8, gy:5.5, dx:-0.002, dy:-0.003, matched:false, highlight:false},
      {gx:7.2, gy:5.2, dx:0.003, dy:0.002, matched:false, highlight:false}
    ];

    var user = null; // {gx,gy}
    var matchPhase = 0; // 0=idle,1=scanning,2=found,3=matched
    var scanR = 0, scanMaxR = 0;
    var statusMsg = 'Drivers updating live. Press [Request Ride] to match.';
    var statusColor = '#8b949e';
    var matchedIdx = -1;
    var raf = null;
    var running = false;

    function gxToX(gx) { return gx * CW; }
    function gyToY(gy) { return GRIDTOP + gy * CH; }

    function draw() {
      if (!document.body.contains(canvas)) return;
      ctx.clearRect(0,0,W,H); ctx.fillStyle='#0d1117'; ctx.fillRect(0,0,W,H);

      // Grid overlay
      ctx.strokeStyle='#161b22'; ctx.lineWidth=0.5;
      for(var gx=0;gx<=GW;gx++) {
        ctx.beginPath(); ctx.moveTo(gxToX(gx),GRIDTOP); ctx.lineTo(gxToX(gx),GRIDTOP+GH*CH); ctx.stroke();
      }
      for(var gy=0;gy<=GH;gy++) {
        ctx.beginPath(); ctx.moveTo(0,gyToY(gy)); ctx.lineTo(W,gyToY(gy)); ctx.stroke();
      }

      // Geohash cell highlight (show a few cells as colored)
      var cells=[{gx:1,gy:1},{gx:4,gy:2},{gx:6,gy:1},{gx:2,gy:5},{gx:7,gy:5}];
      cells.forEach(function(c){
        ctx.fillStyle='rgba(88,166,255,0.04)'; ctx.strokeStyle='rgba(88,166,255,0.15)'; ctx.lineWidth=0.5;
        ctx.beginPath(); ctx.roundRect(gxToX(c.gx),gyToY(c.gy),CW,CH,2); ctx.fill(); ctx.stroke();
      });

      // Scan radius
      if (matchPhase>=1 && user) {
        var ux=gxToX(user.gx), uy=gyToY(user.gy);
        var grad = ctx.createRadialGradient(ux,uy,0,ux,uy,scanR);
        grad.addColorStop(0,'rgba(88,166,255,0.0)');
        grad.addColorStop(0.7,'rgba(88,166,255,0.04)');
        grad.addColorStop(1,'rgba(88,166,255,0.18)');
        ctx.fillStyle=grad;
        ctx.beginPath(); ctx.arc(ux,uy,scanR,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle='rgba(88,166,255,0.4)'; ctx.lineWidth=1.5;
        ctx.setLineDash([4,3]);
        ctx.beginPath(); ctx.arc(ux,uy,scanR,0,Math.PI*2); ctx.stroke();
        ctx.setLineDash([]);
      }

      // Route line to matched driver
      if (matchPhase===3 && user && matchedIdx>=0) {
        var d=drivers[matchedIdx];
        ctx.strokeStyle='#ffa657'; ctx.lineWidth=1.5; ctx.setLineDash([5,3]);
        ctx.beginPath(); ctx.moveTo(gxToX(user.gx),gyToY(user.gy)); ctx.lineTo(gxToX(d.gx),gyToY(d.gy)); ctx.stroke();
        ctx.setLineDash([]);
      }

      // Drivers
      drivers.forEach(function(d,i){
        var x=gxToX(d.gx), y=gyToY(d.gy);
        var isMatched = (matchPhase===3 && i===matchedIdx);
        var isHighlight = (matchPhase===2 && d.highlight);
        ctx.fillStyle = isMatched?'#ffa657':isHighlight?'#ffa657':'#3fb950';
        ctx.beginPath(); ctx.arc(x,y,isMatched?8:5,0,Math.PI*2); ctx.fill();
        if (isMatched||isHighlight) {
          ctx.strokeStyle=isMatched?'#ffa657':'rgba(255,166,87,0.5)'; ctx.lineWidth=1.5;
          ctx.beginPath(); ctx.arc(x,y,isMatched?13:9,0,Math.PI*2); ctx.stroke();
        }
        ctx.fillStyle='#0d1117'; ctx.font='bold 8px monospace'; ctx.textAlign='center';
        ctx.fillText('D'+(i+1), x, y+3);
      });

      // User dot
      if (user) {
        var ux2=gxToX(user.gx), uy2=gyToY(user.gy);
        var pulse = (Math.sin(Date.now()*0.008)+1)/2;
        ctx.fillStyle='#58a6ff';
        ctx.beginPath(); ctx.arc(ux2,uy2,7,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle='rgba(88,166,255,'+(0.3+0.4*pulse)+')'; ctx.lineWidth=2;
        ctx.beginPath(); ctx.arc(ux2,uy2,11+pulse*3,0,Math.PI*2); ctx.stroke();
        ctx.fillStyle='#0d1117'; ctx.font='bold 8px monospace'; ctx.textAlign='center';
        ctx.fillText('U', ux2, uy2+3);
      }

      // Legend
      ctx.fillStyle='#8b949e'; ctx.font='9px monospace'; ctx.textAlign='left';
      ctx.fillText('■ Driver (live GPS)  ■ User  ■ Matched', 8, H-32);
      ctx.fillStyle='#3fb950'; ctx.fillRect(8,H-28,7,7);
      ctx.fillStyle='#58a6ff'; ctx.fillRect(72,H-28,7,7);
      ctx.fillStyle='#ffa657'; ctx.fillRect(106,H-28,7,7);

      // Status bar
      ctx.fillStyle=statusColor; ctx.font='10px monospace'; ctx.textAlign='center';
      ctx.fillText(statusMsg, W/2, H-10);

      // Title
      ctx.fillStyle='#8b949e'; ctx.font='11px monospace'; ctx.textAlign='left';
      ctx.fillText('RIDE MATCHING  •  geohash grid  •  GEORADIUS', 8, 18);
    }

    var nearestDrivers = [];

    function requestRide() {
      // Place user at center-ish
      user = {gx:4.5, gy:3.5};
      matchPhase=1; scanR=0; matchedIdx=-1;
      nearestDrivers=[];
      drivers.forEach(function(d){d.highlight=false; d.matched=false;});
      statusMsg='Scanning for nearby drivers...'; statusColor='#58a6ff';

      var scanTarget = Math.min(W,H)*0.35;
      // Find 3 nearest drivers
      var dists = drivers.map(function(d,i){
        var dx=d.gx-user.gx, dy=d.gy-user.gy;
        return {i:i, dist:Math.sqrt(dx*dx+dy*dy)};
      });
      dists.sort(function(a,b){return a.dist-b.dist;});
      nearestDrivers=[dists[0].i,dists[1].i,dists[2].i];

      var scanStart=Date.now();
      var scanDur=1200;
      function scanStep(){
        if(!document.body.contains(canvas)) return;
        var t=(Date.now()-scanStart)/scanDur;
        if(t>=1){
          scanR=scanTarget;
          matchPhase=2;
          nearestDrivers.forEach(function(ni){drivers[ni].highlight=true;});
          statusMsg='3 drivers found → calculating ETA...'; statusColor='#ffa657';
          setTimeout(function(){
            if(!document.body.contains(canvas)) return;
            matchedIdx=dists[0].i;
            matchPhase=3;
            drivers[matchedIdx].matched=true;
            drivers.forEach(function(d){d.highlight=false;});
            statusMsg='Matched Driver-'+(matchedIdx+1)+' • ETA ~3min → Route shown'; statusColor='#ffa657';
          }, 1000);
        } else {
          scanR=t*scanTarget;
          raf=requestAnimationFrame(scanStep);
        }
      }
      scanStep();
    }

    function animLoop(){
      if(!document.body.contains(canvas)) return;
      // Drift drivers
      drivers.forEach(function(d){
        d.gx+=d.dx; d.gy+=d.dy;
        if(d.gx<0.3||d.gx>GW-0.3) d.dx*=-1;
        if(d.gy<0.3||d.gy>GH-0.3) d.dy*=-1;
      });
      draw();
      raf=requestAnimationFrame(animLoop);
    }

    animLoop();

    var b=document.createElement('button'); b.textContent='Request Ride'; b.style.cssText=btnStyle; b.onclick=requestRide; btnRow.appendChild(b);
    var b2=document.createElement('button'); b2.textContent='Reset'; b2.style.cssText=btnStyle;
    b2.onclick=function(){user=null;matchPhase=0;scanR=0;matchedIdx=-1;nearestDrivers=[];drivers.forEach(function(d){d.highlight=false;d.matched=false;});statusMsg='Drivers updating live. Press [Request Ride] to match.';statusColor='#8b949e';};
    btnRow.appendChild(b2);
  },
  uml:{
    title:"Ride Request — Matching Flow",
    scenario:"Rider requests trip; system finds and dispatches driver",
    actors:[
      {id:"rider",label:"Rider App"},
      {id:"api",label:"Trip API"},
      {id:"supply",label:"Supply Service"},
      {id:"redis",label:"Redis Geo"},
      {id:"dispatch",label:"Dispatch Service"},
      {id:"driver",label:"Driver App"}
    ],
    messages:[
      {from:"rider",to:"api",label:"POST /trips (lat, lng, carType)",detail:"Rider requests trip with pickup location and car type preference.",type:"sync"},
      {from:"api",to:"supply",label:"findNearbyDrivers(lat, lng, 5km)",detail:"Supply service queried for available drivers within 5km radius.",type:"sync"},
      {from:"supply",to:"redis",label:"GEORADIUS drivers:available",detail:"Redis returns list of driver IDs sorted by distance.",type:"sync"},
      {from:"redis",to:"supply",label:"[driver-1: 0.8km, driver-2: 1.2km, ...]",detail:"Top 20 nearby available drivers returned.",type:"sync"},
      {from:"supply",to:"api",label:"Ranked candidates",detail:"Candidates ranked by ETA (distance × traffic factor) and rating.",type:"sync"},
      {from:"api",to:"dispatch",label:"matchTrip(tripId, candidates)",detail:"Dispatch service tries candidates in order. Sends offer to best match.",type:"async"},
      {from:"dispatch",to:"redis",label:"ZREM drivers:available driver-1",detail:"Atomically remove driver-1 from pool. Prevents double-matching.",type:"sync"},
      {from:"dispatch",to:"driver",label:"Push: TripOffer(tripId, pickup, fare)",detail:"Push notification + WebSocket message sent to driver-1.",type:"async"},
      {from:"driver",to:"dispatch",label:"ACCEPTED (within 10s)",detail:"Driver accepts offer.",type:"sync"},
      {from:"dispatch",to:"rider",label:"Push: DriverMatched(driverInfo, ETA)",detail:"Rider sees driver name, car, rating, and live ETA on map.",type:"async"},
      {from:"driver",to:"api",label:"WebSocket: location updates every 4s",detail:"Driver location streamed to rider's map in real-time.",type:"async"}
    ]
  }
};
  window.SYSDESIGN_TOPICS = (window.SYSDESIGN_TOPICS || []).concat([topic]);
})();
