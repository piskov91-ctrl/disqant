import {
  buildWearMeIntegrationEmailHtml,
  buildWearMeIntegrationPlainEmailBody,
} from "@/lib/fitRoomWearMeIntegrationEmail";

export function buildDeveloperInstallEmail(params: { snippet: string; storeLabel: string }): {
  subject: string;
  text: string;
  html: string;
} {
  const store = params.storeLabel.trim() || "there";
  const subject = "Your Wear Me integration guide";
  const text = buildWearMeIntegrationPlainEmailBody(store, params.snippet);
  const html = buildWearMeIntegrationEmailHtml({
    emailSubjectLine: subject,
    storeLabel: store,
    snippet: params.snippet,
    heading: "Your Wear Me integration",
  });
  return { subject, text, html };
}
