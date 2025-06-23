import TournamentManager from "@/components/admin/tournament-manager"

export default function TournamentsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-6">Tournament Management</h1>
        <TournamentManager />
      </div>
    </div>
  )
}
