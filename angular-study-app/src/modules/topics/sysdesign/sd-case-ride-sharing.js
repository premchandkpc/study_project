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
  visual: {
    type: 'layered',
    title: 'Ride Sharing Architecture (Uber/Lyft)',
    layers: [
      {
        id: 'client', label: 'Client Layer', color: '#58a6ff', protocols: 'HTTPS · WebSocket',
        services: [
          { id: 'rider-app',  label: 'Rider App',   icon: '📱', sublabel: 'Request ride · Track driver' },
          { id: 'driver-app', label: 'Driver App',  icon: '🚗', sublabel: 'GPS every 4s · Accept trips' }
        ]
      },
      {
        id: 'gateway', label: 'API Gateway Layer', color: '#e3b341', protocols: 'REST · WebSocket',
        services: [
          { id: 'api-gw', label: 'API Gateway', icon: '🚪', sublabel: 'Auth · Rate limit · Routing' }
        ]
      },
      {
        id: 'services', label: 'Core Services Layer', color: '#ffa657', protocols: 'gRPC · HTTP/2',
        services: [
          { id: 'trip-svc',     label: 'Trip Service',     icon: '🗺️', sublabel: 'State machine: REQ→DONE' },
          { id: 'dispatch-svc', label: 'Dispatch Service', icon: '⚡', sublabel: 'Match rider ↔ driver' },
          { id: 'location-svc', label: 'Location Service', icon: '📍', sublabel: 'GEOADD · 125K writes/s' },
          { id: 'supply-svc',   label: 'Supply Service',   icon: '🔍', sublabel: 'GEORADIUS · 5km search' },
          { id: 'pricing-svc',  label: 'Surge Pricing',    icon: '💰', sublabel: 'H3 hex · demand/supply' }
        ]
      },
      {
        id: 'data', label: 'Data Layer', color: '#bc8cff', protocols: 'TCP · TLS',
        services: [
          { id: 'redis-geo',  label: 'Redis Geo',    icon: '⚡', sublabel: 'Driver positions · GEORADIUS' },
          { id: 'cassandra',  label: 'Cassandra',    icon: '🗄️', sublabel: 'Trip history · Time-series' },
          { id: 'kafka',      label: 'Kafka',        icon: '📨', sublabel: 'Location events · Trip events' },
          { id: 'postgres',   label: 'PostgreSQL',   icon: '🐘', sublabel: 'Users · Payments · Ratings' }
        ]
      },
      {
        id: 'realtime', label: 'Real-Time Push Layer', color: '#3fb950', protocols: 'WebSocket · SSE',
        services: [
          { id: 'ws-server',  label: 'WebSocket Server', icon: '🔌', sublabel: 'Driver location → Rider map' },
          { id: 'push-svc',   label: 'Push Notifications', icon: '🔔', sublabel: 'FCM · APNs · Trip updates' }
        ]
      }
    ],
    flows: [
      { name: 'Ride Request',    path: ['rider-app', 'api-gw', 'trip-svc', 'dispatch-svc', 'redis-geo'],   color: '#58a6ff' },
      { name: 'Driver Match',    path: ['dispatch-svc', 'supply-svc', 'redis-geo', 'dispatch-svc', 'driver-app'], color: '#ffa657' },
      { name: 'Location Update', path: ['driver-app', 'location-svc', 'redis-geo', 'kafka'],                color: '#3fb950' },
      { name: 'Surge Pricing',   path: ['pricing-svc', 'redis-geo', 'kafka', 'postgres'],                   color: '#bc8cff' }
    ]
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
