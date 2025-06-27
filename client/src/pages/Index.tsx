import { Footer } from '@/components/Footer'
import { GridCanvas } from '@/components/GridCanvas'
import { Header } from '@/components/Header'
import { Sidebar } from '@/components/Sidebar'
import { WebSocketManager } from '@/components/WebSocketManager'

const Index = () => {
  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col overflow-hidden">
      <WebSocketManager />

      <Header />

      <div className="flex-1 flex overflow-hidden relative">
        <Sidebar />
        <GridCanvas />
      </div>

      <Footer />
    </div>
  )
}

export default Index
