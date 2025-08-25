export type OrderEmail = {
to: string;
subject: string;
text: string;
};

export async function sendEmail(msg: OrderEmail) {
// TODO: integrate a provider (Resend, Postmark, SendGrid).
// For now, just log so flows are in place.
console.log("[email] to:", msg.to, "subject:", msg.subject, "text:", msg.text);
}