import { redirect } from "next/navigation";

/** Legacy path; registration lives at `/register`. */
export default function SignupRedirectPage() {
  redirect("/register");
}
