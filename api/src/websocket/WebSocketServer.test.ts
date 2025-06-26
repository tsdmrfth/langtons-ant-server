import http from 'http'
import WebSocket from 'ws'
import { GameConfig, Rule } from '../types/game'
import { WebSocketServer } from './WebSocketServer'

describe('WebSocketServer', () => {
  const gameConfig: GameConfig = {
    gridWidth: 100,
    gridHeight: 100,
    tickInterval: 100,
    maxPlayers: 10,
    heartbeatInterval: 1000,
    rateLimitWindowMs: 1000,
    maxMessagesPerWindow: 10,
    gridChunkSize: 100
  }
  let httpServer: http.Server
  let wss: WebSocketServer
  let port: number

  beforeEach(done => {
    httpServer = http.createServer()
    httpServer.listen(0, () => {
      port = (httpServer.address() as any).port as number
      wss = new WebSocketServer(httpServer, gameConfig)
      done()
    })
  })

  afterEach(done => {
    if (wss) {
      wss.stop()
    }
    if (httpServer) {
      httpServer.close(() => done())
    } else {
      done()
    }
  })

  const createClient = () => new WebSocket(`ws://localhost:${port}`)

  it('broadcasts PLAYER_JOINED when a client connects', done => {
    const client = createClient()

    client.on('message', data => {
      const message = JSON.parse(data.toString())
      if (message.type === 'PLAYER_JOINED') {
        expect(message.payload).toHaveProperty('playerId')
        expect(message.payload).toHaveProperty('color')
        client.close()
        done()
      }
    })
  })

  it('broadcasts ANT_PLACED to all clients', done => {
    const clientA = createClient()
    const clientB = createClient()
    const rules: Rule[] = [{ cellColor: '#FFFFFF', turnDirection: 'RIGHT' }]

    let ready = 0
    const checkReady = () => {
      ready += 1
      if (ready === 2) {
        const antPlace = {
          type: 'PLACE_ANT',
          payload: {
            position: { x: 0, y: 0 },
            rules
          }
        }
        clientA.send(JSON.stringify(antPlace))
      }
    }

    clientA.once('message', () => checkReady())
    clientB.once('message', () => checkReady())
    clientB.on('message', data => {
      const message = JSON.parse(data.toString())
      if (message.type === 'ANT_PLACED') {
        expect(message.payload).toHaveProperty('cells')
        expect(message.payload).toHaveProperty('ant')
        clientA.close()
        clientB.close()
        done()
      }
    })
  })

  it('broadcasts RULES_CHANGED updates', done => {
    const client = createClient()
    const rules: Rule[] = [{ cellColor: '#FFFFFF', turnDirection: 'LEFT' }]

    let playerId: string | null = null

    client.on('message', data => {
      const message = JSON.parse(data.toString())

      if (message.type === 'PLAYER_JOINED') {
        playerId = message.payload.playerId
        const antPlace = {
          type: 'PLACE_ANT',
          payload: {
            position: { x: 1, y: 1 },
            rules
          }
        }
        client.send(JSON.stringify(antPlace))
      }

      if (message.type === 'ANT_PLACED') {
        const ruleChange = {
          type: 'CHANGE_RULES',
          payload: { rules }
        }
        client.send(JSON.stringify(ruleChange))
      }

      if (message.type === 'RULES_CHANGED') {
        expect(message.payload.playerId).toBe(playerId)
        expect(message.payload.rules).toEqual(rules)
        client.close()
        done()
      }
    })
  })

  it('broadcasts TILE_FLIPPED snapshots', done => {
    const client = createClient()

    const rules: Rule[] = [{ cellColor: '#FFFFFF', turnDirection: 'RIGHT' }]

    enum Phase {
      Joined,
      Placed,
      Flipped
    }

    let phase = Phase.Joined

    client.on('message', data => {
      const message = JSON.parse(data.toString())

      if (phase === Phase.Joined && message.type === 'PLAYER_JOINED') {
        const antPlace = {
          type: 'PLACE_ANT',
          payload: { position: { x: 2, y: 2 }, rules }
        }
        client.send(JSON.stringify(antPlace))
        phase = Phase.Placed
        return
      }

      if (phase === Phase.Placed && message.type === 'ANT_PLACED') {
        const flip = {
          type: 'FLIP_TILE',
          payload: { position: { x: 3, y: 3 } }
        }
        client.send(JSON.stringify(flip))
        phase = Phase.Flipped
        return
      }

      if (phase === Phase.Flipped && message.type === 'TILE_FLIPPED') {
        expect(message.payload).toHaveProperty('cells')
        client.close()
        done()
      }
    })
  })

  it('updates game config before game starts and broadcasts GAME_CONFIG_UPDATED', done => {
    const client = createClient()
    let gotWelcome = false
    client.on('message', data => {
      const message = JSON.parse(data.toString())
      if (message.type === 'WELCOME') {
        gotWelcome = true
        client.send(JSON.stringify({
          type: 'UPDATE_GAME_CONFIG',
          payload: { gridSize: 42, tickInterval: 123 }
        }))
      }
      if (gotWelcome && message.type === 'GAME_CONFIG_UPDATED') {
        expect(message.payload.gridSize).toBe(42)
        expect(message.payload.tickInterval).toBe(123)
        client.close()
        done()
      }
    })
  })

  it('returns error if updating config after ant placed', done => {
    const client = createClient()
    let phase = 0
    const rules = [{ cellColor: '#FFFFFF', turnDirection: 'RIGHT' }]
    client.on('message', data => {
      const message = JSON.parse(data.toString())
      if (message.type === 'WELCOME' && phase === 0) {
        client.send(JSON.stringify({
          type: 'PLACE_ANT',
          payload: { position: { x: 0, y: 0 }, rules }
        }))
        phase = 1
      }
      if (message.type === 'ANT_PLACED' && phase === 1) {
        client.send(JSON.stringify({
          type: 'UPDATE_GAME_CONFIG',
          payload: { gridSize: 99, tickInterval: 99 }
        }))
        phase = 2
      }
      if (message.type === 'ERROR' && phase === 2) {
        expect(message.payload.message).toMatch(/game already started/i)
        client.close()
        done()
      }
    })
  })

  describe('Security', () => {
    it('rejects connections from disallowed origins', done => {
      wss.stop()
      httpServer.close(() => {
        httpServer = http.createServer()
        httpServer.listen(0, () => {
          port = (httpServer.address() as any).port as number
          wss = new WebSocketServer(httpServer, gameConfig, ['http://allowed.com'])
          const client = new WebSocket(`ws://localhost:${port}`, undefined, {
            headers: { Origin: 'http://evil.com' }
          })

          const fail = () => {
            client.terminate()
            wss.stop()
            httpServer.close(() => { })
          }

          client.on('open', () => {
            fail()
            done(new Error('Connection should have been rejected'))
          })

          client.on('error', () => {
            fail()
            done()
          })
        })
      })
    })

    it('sends ERROR when rate limit exceeded', done => {
      const client = createClient()
      const rules: Rule[] = [{ cellColor: '#FFFFFF', turnDirection: 'RIGHT' }]

      let rateErrorReceived = false
      const floodMessages = () => {
        for (let i = 0; i < 31; i++) {
          const payload = {
            type: 'CHANGE_RULES',
            payload: { rules }
          }
          client.send(JSON.stringify(payload))
        }
      }

      client.on('message', data => {
        const message = JSON.parse(data.toString())

        if (message.type === 'PLAYER_JOINED') {
          floodMessages()
        }

        if (message.type === 'ERROR' && message.payload?.message === 'Rate limit exceeded') {
          rateErrorReceived = true
          client.close()
          clearTimeout(timeout)
          done()
        }
      })

      const timeout = setTimeout(() => {
        if (!rateErrorReceived) {
          client.close()
          done(new Error('Rate limit error not received'))
        }
      }, 2000)
    })
  })

  describe('Validation', () => {
    const rule: Rule = { cellColor: '#FFFFFF', turnDirection: 'RIGHT' }

    it('sends ERROR when message has no type', done => {
      const client = createClient()

      client.on('message', data => {
        const message = JSON.parse(data.toString())

        if (message.type === 'PLAYER_JOINED') {
          client.send(JSON.stringify({ payload: {} }))
          return
        }

        if (message.type === 'ERROR') {
          expect(message.payload.message).toMatch(/missing type/i)
          client.close()
          done()
        }
      })

      client.on('error', () => {
        client.close()
        done()
      })
    })

    it('sends ERROR for unknown message type', done => {
      const client = createClient()

      client.on('message', data => {
        const message = JSON.parse(data.toString())

        if (message.type === 'PLAYER_JOINED') {
          const invalid = { type: 'UNKNOWN_TYPE', payload: {} }
          client.send(JSON.stringify(invalid))
          return
        }

        if (message.type === 'ERROR') {
          expect(message.payload.message).toMatch(/invalid message type/i)
          client.close()
          done()
        }
      })

      client.on('error', () => {
        client.close()
        done()
      })
    })

    it('sends ERROR when message has no payload', done => {
      const client = createClient()

      client.on('message', data => {
        const message = JSON.parse(data.toString())

        if (message.type === 'PLAYER_JOINED') {
          client.send(JSON.stringify({ type: 'PLACE_ANT' }))
          return
        }

        if (message.type === 'ERROR') {
          expect(message.payload.message).toMatch(/missing payload/i)
          client.close()
          done()
        }
      })

      client.on('error', () => {
        client.close()
        done()
      })
    })
  })
}) 
