import { Link } from 'react-router-dom'

export default function AdminPage() {
  return (
    <div className="page-shell">
      <div className="page-content">
        <h1>Admin Dashboard</h1>
        <p>Coming soon: tools to manage campus maps, routes and locations.</p>
        <Link to="/" className="page-link">
          ← Back to login
        </Link>
      </div>
    </div>
  )
}
