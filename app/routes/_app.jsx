import { json, redirect } from "@remix-run/node";
import { Outlet, useLoaderData } from "@remix-run/react";
import { AppLayout } from "../components/AppLayout";

export async function loader({ request }) {
  const apiUrl = new URL("/api/meta", request.url);
  const res = await fetch(apiUrl.toString(), {
    headers: {
      cookie: request.headers.get("cookie") || ""
    }
  });

  if (res.status === 401) {
    return redirect("/signin");
  }

  const user = await res.json();
  return json({ user });
}

export default function AppRoute() {
  const { user } = useLoaderData();
  return (
    <AppLayout user={user}>
      <Outlet />
    </AppLayout>
  );
}

