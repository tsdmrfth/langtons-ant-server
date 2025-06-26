import { environment } from '@/config/environment'
import WebSocketService from './WebSocketService'

const webSocketService = new WebSocketService(environment.websocketUrl)
export default webSocketService 