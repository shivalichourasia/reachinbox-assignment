import { useAuth } from "../context/AuthContext";
import { Button } from "./Button";

export function Header() {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
      <h1 className="text-lg font-semibold text-slate-900">ReachInbox Scheduler</h1>
      <div className="flex items-center gap-3">
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt={user.name} className="h-8 w-8 rounded-full" />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-sm font-medium text-indigo-700">
            {user.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="text-sm leading-tight">
          <p className="font-medium text-slate-800">{user.name}</p>
          <p className="text-slate-400">{user.email}</p>
        </div>
        <Button variant="ghost" onClick={logout}>
          Logout
        </Button>
      </div>
    </header>
  );
}
