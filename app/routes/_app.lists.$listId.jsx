import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import ListDetailPage from "../components/ListDetailPage";
import { loadListDetail, saveListDetail } from "../models/lists.server";

function readFormString(formData, key) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function loader({ request, params }) {
  try {
    const result = await loadListDetail({
      request,
      uuid: params.listId || "",
    });
    return json({
      listDetail: result.data,
      error: null,
    });
  } catch (error) {
    return json({
      listDetail: null,
      error: error instanceof Error ? error.message : "Unable to load list detail.",
    });
  }
}

export async function action({ request, params }) {
  const formData = await request.formData();
  const intent = readFormString(formData, "intent");

  if (intent !== "save_list_details") {
    return json({
      ok: false,
      error: "Unsupported list action.",
    }, { status: 400 });
  }

  try {
    const result = await saveListDetail({
      request,
      uuid: params.listId || "",
      name: readFormString(formData, "name"),
      description: readFormString(formData, "description"),
      listTypeSlug: readFormString(formData, "listTypeSlug"),
      listSubTypeSlug: readFormString(formData, "listSubTypeSlug"),
      subjectType: readFormString(formData, "subjectType"),
      membershipMode: readFormString(formData, "membershipMode"),
      status: readFormString(formData, "status"),
    });

    return json({
      ok: true,
      list: result.data,
    });
  } catch (error) {
    return json({
      ok: false,
      error: error instanceof Error ? error.message : "Unable to save list detail.",
    }, { status: 500 });
  }
}

export default function ListDetailRoute() {
  const data = useLoaderData();
  return <ListDetailPage listDetail={data?.listDetail} error={data?.error} />;
}
