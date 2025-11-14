export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-12 px-4">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Test Environment Management System
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Manage, monitor, and optimize your test environments
        </p>
        <p className="mb-6">
          <a href="/login" className="text-blue-600 underline">Sign in</a>
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-2">Environments</h2>
            <p className="text-gray-600">Create and manage test environments</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-2">Bookings</h2>
            <p className="text-gray-600">Reserve and schedule environments</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-2">Monitoring</h2>
            <p className="text-gray-600">Real-time metrics and alerts</p>
          </div>
        </div>
      </div>
    </main>
  );
}
