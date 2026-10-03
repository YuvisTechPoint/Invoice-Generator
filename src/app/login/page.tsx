import { isStudioAuthRequired } from "@/lib/config/env";
import { redirect } from "next/navigation";
import { routes } from "@/lib/routes";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  if (!isStudioAuthRequired()) {
    redirect(routes.invoices);
  }

  return <LoginForm />;
}
