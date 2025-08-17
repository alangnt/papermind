import { useState, FormEvent } from 'react';

export default function LoginComponent({ onLoggedIn }: { onLoggedIn?: () => void }) {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const valueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value
    }));
  }

  const loginUser = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      const body = new URLSearchParams();
      body.set("username", formData.username);
      body.set("password", formData.password);
      body.set("grant_type", "password");

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/token/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`${res.status} ${res.statusText}: ${err.detail ?? "Login failed"}`);
      }

      const data = await res.json();
      localStorage.setItem("access_token", data.access_token);
      onLoggedIn?.();
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <div className="bg-black">
      <form onSubmit={(e) => loginUser(e)}>
        <div className="flex items-center gap-2">
          <label htmlFor="username">Username</label>
          <input type="text" id="username" value={formData.username} onChange={valueChange} className="p-2 border rounded-lg" />
        </div>
     
        <div className="flex items-center gap-2">
          <label htmlFor="password">Password</label>
          <input type="password" id="password" value={formData.password} onChange={valueChange} className="p-2 border rounded-lg" />
        </div>

        <button type="submit" className="p-2 border rounded-lg">Login</button>
      </form>
    </div>
  )
}