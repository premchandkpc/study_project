# Study Lab — Skills Reference

> This folder documents everything built: topics, animations, engines, patterns.
> Use as reference before adding new content — extend don't duplicate.

## Files

| File                                   | Contents                                         |
| -------------------------------------- | ------------------------------------------------ |
| [ANIMATIONS.md](ANIMATIONS.md)         | All animation engines, classes, APIs, how to use |
| [JAVA.md](JAVA.md)                     | All Java topics built                            |
| [SYSTEM-DESIGN.md](SYSTEM-DESIGN.md)   | All system design topics built                   |
| [DSA.md](DSA.md)                       | All DSA problems, patterns, templates            |
| [REACT.md](REACT.md)                   | All React topics + ReactViz engine               |
| [ANGULAR.md](ANGULAR.md)               | Angular topics + app architecture                |
| [DATABASES.md](DATABASES.md)           | Database internals topics                        |
| [KAFKA.md](KAFKA.md)                   | Kafka / RabbitMQ / WarpStream topics             |
| [MICROSERVICES.md](MICROSERVICES.md)   | Microservices topics                             |
| [GOLANG.md](GOLANG.md)                 | Go topics                                        |
| [RUST.md](RUST.md)                     | Rust topics                                      |
| [PYTHON.md](PYTHON.md)                 | Python topics                                    |
| [TOPIC-TEMPLATE.md](TOPIC-TEMPLATE.md) | Copy-paste template for new topics               |

## Quick Rules

- Every topic = one self-contained IIFE in `src/modules/topics/<area>/`
- No code in `visual()` that belongs elsewhere — embed algorithm code inline
- Reuse animation engines — don't build custom SVG from scratch
- All `visual(mount)` functions must be safe to call multiple times
