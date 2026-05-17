(function() {
  var topic = {
  id:"sd-protocols-grpc", area:"sysdesign",
  title:"gRPC, Protobuf & Bidirectional Streaming",
  tag:"Protocols", tags:["grpc","protobuf","streaming","http2","rpc","service mesh"],
  concept:`**gRPC** is a high-performance RPC framework by Google. It uses **Protocol Buffers** (Protobuf) for serialisation and **HTTP/2** for transport.

**Why gRPC over REST+JSON?**
- Protobuf binary is **5-10× smaller** and **6× faster** to serialise than JSON
- HTTP/2 multiplexing — all streams share one connection
- **Strongly typed** contract via .proto files — compile-time checking
- Native **streaming** (4 modes: unary, server-stream, client-stream, bidirectional)
- First-class code generation for 12+ languages

**The 4 RPC modes:**
\`\`\`protobuf
service OrderService {
  // 1. Unary — one request, one response
  rpc GetOrder(OrderRequest) returns (Order);

  // 2. Server streaming — one request, stream of responses
  rpc WatchOrder(OrderRequest) returns (stream OrderEvent);

  // 3. Client streaming — stream of requests, one response
  rpc BatchCreate(stream CreateRequest) returns (BatchResult);

  // 4. Bidirectional — both sides stream
  rpc Chat(stream Message) returns (stream Message);
}
\`\`\`

**When to prefer REST:** public APIs (browser clients can't call gRPC natively without grpc-web proxy), simple CRUD, teams unfamiliar with Protobuf.`,
  why:`Microservice-to-microservice communication at scale (Google, Netflix, Uber internal) uses gRPC because the payload savings and streaming modes reduce bandwidth by 10× and latency by 2-3× vs JSON/REST.`,
  example:{
    language:"go",
    code:`// proto definition
// file: order.proto
syntax = "proto3";
service OrderService {
  rpc GetOrder(OrderRequest) returns (Order);
  rpc WatchOrder(OrderRequest) returns (stream OrderEvent);
}
message OrderRequest { string order_id = 1; }
message Order {
  string id = 1;
  string status = 2;
  double total = 3;
}
message OrderEvent { string order_id = 1; string event = 2; }

// ── Go server implementation ──
package main

import (
    "context"
    "time"
    pb "myapp/gen/order"
    "google.golang.org/grpc"
    "net"
)

type server struct{ pb.UnimplementedOrderServiceServer }

func (s *server) GetOrder(ctx context.Context, req *pb.OrderRequest) (*pb.Order, error) {
    return &pb.Order{Id: req.OrderId, Status: "DELIVERED", Total: 99.99}, nil
}

func (s *server) WatchOrder(req *pb.OrderRequest, stream pb.OrderService_WatchOrderServer) error {
    events := []string{"CONFIRMED", "PACKED", "SHIPPED", "DELIVERED"}
    for _, ev := range events {
        if err := stream.Send(&pb.OrderEvent{OrderId: req.OrderId, Event: ev}); err != nil {
            return err
        }
        time.Sleep(500 * time.Millisecond)
    }
    return nil
}

func main() {
    lis, _ := net.Listen("tcp", ":50051")
    s := grpc.NewServer()
    pb.RegisterOrderServiceServer(s, &server{})
    s.Serve(lis)
}`,
    notes:"Run `protoc --go_out=. --go-grpc_out=. order.proto` to generate type-safe client/server stubs."
  },
  interview:[
    {question:"How does Protobuf serialisation achieve smaller payload sizes than JSON?",
     answer:`Protobuf uses field **numbers** (varint-encoded) instead of string field names. Each field is encoded as a tag (field number + wire type) followed by the value — no quotes, no brackets, no whitespace.\n\nExample: \`{"status":"DELIVERED","total":99.99}\` is 34 bytes JSON vs ~10 bytes Protobuf.\n\nAdditionally: integers use variable-length encoding (small numbers = fewer bytes), repeated fields avoid repeated keys, default values are omitted entirely.`,
     followUps:["What happens when you add a new field to a Protobuf schema?","How do you handle Protobuf schema evolution without breaking clients?"]
    },
    {question:"How would you expose a gRPC service to a browser-based frontend?",
     answer:`Browsers can't call gRPC natively (no HTTP/2 trailer support). Options:\n\n1. **grpc-web** — Envoy/nginx proxy translates gRPC-web (HTTP/1.1) → gRPC. Supports unary and server streaming.\n2. **Transcoding** — gRPC-gateway generates a REST+JSON proxy from proto annotations. Same service, two interfaces.\n3. **Connect protocol** — modern alternative (Buf Connect); works natively in browsers without proxy, compatible with gRPC servers.`,
     followUps:["What is the Connect protocol?"]
    }
  ],
  tradeoffs:{
    pros:["5-10× smaller payload vs JSON","HTTP/2 multiplexing — no connection per call","Native streaming — bidirectional is unique to gRPC","Strong typing + codegen eliminates serialisation bugs"],
    cons:["Not human-readable — harder to debug without tooling","Browser support requires proxy (grpc-web)","Protobuf schema management adds overhead","Steeper learning curve than REST"],
    when:"Internal microservice communication, high-throughput data pipelines, streaming use cases. Use REST for public APIs or when browser clients call directly."
  },
  uml:{
    title:"gRPC Order Service — Sequence",
    scenario:"Client gets order then watches live status stream",
    actors:[
      {id:"client",label:"Go Client"},
      {id:"stub",label:"gRPC Stub"},
      {id:"server",label:"OrderService"},
      {id:"db",label:"Database"}
    ],
    messages:[
      {from:"client",to:"stub",label:"GetOrder(id=42)",detail:"Unary call — client blocks until response.",type:"sync"},
      {from:"stub",to:"server",label:"Protobuf frame over HTTP/2",detail:"Binary serialised OrderRequest sent on HTTP/2 stream.",type:"sync"},
      {from:"server",to:"db",label:"SELECT * FROM orders WHERE id=42",detail:"DB lookup for order details.",type:"sync"},
      {from:"db",to:"server",label:"Row result",detail:"Order data returned.",type:"sync"},
      {from:"server",to:"stub",label:"Order{status:DELIVERED}",detail:"Protobuf-serialised Order response.",type:"sync"},
      {from:"stub",to:"client",label:"Decoded Order struct",detail:"Client receives typed Go struct — no JSON parsing.",type:"sync"},
      {from:"client",to:"stub",label:"WatchOrder(id=42)",detail:"Opens server-streaming RPC on new HTTP/2 stream.",type:"async"},
      {from:"server",to:"client",label:"stream: CONFIRMED",detail:"First OrderEvent pushed to client.",type:"async"},
      {from:"server",to:"client",label:"stream: SHIPPED",detail:"Second event pushed asynchronously.",type:"async"},
      {from:"server",to:"client",label:"stream: DELIVERED + EOF",detail:"Final event; server closes stream with trailer.",type:"async"}
    ]
  },
  visual: {
    type: 'flow',
    title: 'gRPC — 4 RPC Modes over HTTP/2',
    direction: 'horizontal',
    nodes: [
      { id: 'client',  label: 'Go Client',    color: '#58a6ff', icon: '💻', sublabel: 'gRPC stub' },
      { id: 'channel', label: 'gRPC Channel', color: '#ffa657', icon: '⚡', sublabel: 'HTTP/2 multiplex' },
      { id: 'server',  label: 'gRPC Server',  color: '#3fb950', icon: '🖥',  sublabel: 'Protobuf handlers' }
    ],
    connections: [
      { from: 'client',  to: 'channel', label: 'Protobuf frame',  protocol: 'HTTP/2' },
      { from: 'channel', to: 'server',  label: 'stream / request' },
      { from: 'server',  to: 'channel', label: 'response / stream', dashed: true },
      { from: 'channel', to: 'client',  label: 'decoded struct',    dashed: true }
    ],
    scenarios: [
      { name: 'Unary',             path: ['client', 'channel', 'server'],         result: 'One request → one response. Client blocks until reply.', resultColor: '#58a6ff' },
      { name: 'Server Stream',     path: ['client', 'channel', 'server', 'channel', 'client'], result: 'Single request → server pushes multiple events downstream.', resultColor: '#3fb950' },
      { name: 'Client Stream',     path: ['client', 'channel', 'server'],         result: 'Client streams chunks → server aggregates → single reply.', resultColor: '#ffa657' },
      { name: 'Bidirectional',     path: ['client', 'channel', 'server'],         result: 'Both sides stream simultaneously over one HTTP/2 connection.', resultColor: '#bc8cff' }
    ]
  }
};
  window.SYSDESIGN_TOPICS = (window.SYSDESIGN_TOPICS || []).concat([topic]);
})();
