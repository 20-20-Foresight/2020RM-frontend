import { json, redirect } from "@remix-run/node";
import { Outlet, useLoaderData } from "@remix-run/react";
import { AppLayout } from "../components/AppLayout";
import { BlockedAccessPage } from "../components/BlockedAccessPage";
const { loadSessionMeta } = require("../models/session-meta.server");

export async function loader({ request }) {
  const meta = await loadSessionMeta({ request });
  if (meta.redirectToSignin) {
    return redirect("/signin");
  }

  return json({ meta });
}

export default function AppRoute() {
  const { meta } = useLoaderData();
  const user = meta?.user || null;

  if (meta?.blocked) {
    return <BlockedAccessPage meta={meta} />;
  }

  return (
    <AppLayout user={user} meta={meta}>
      <Outlet />
    </AppLayout>
  );
}
