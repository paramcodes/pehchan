export const metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-12 sm:py-16">
      <p className="eyebrow">Privacy</p>
      <h1 className="display mt-3 text-5xl">What we keep.</h1>

      <div className="mt-8 flex flex-col gap-6 text-sm leading-7 text-muted">
        <p>
          Pehchan stores the account you create, the messages you send, and the companion
          definitions you write. Conversations are private to your account by default.
        </p>
        <p>
          To remember details between conversations, the app turns parts of your messages into
          embeddings and stores them with the conversation. Memories are tied to your account and
          are retrieved only for you.
        </p>
        <p>
          Model requests go to the provider configured by the operator of this deployment.
          Self-hosted providers keep the data on that host. Third-party providers apply their own
          retention policy.
        </p>
        <p>
          Deleting a companion removes its conversations and memories. Deleting your account removes
          the rows tied to it.
        </p>
        <p>
          This is a self-hosted demo. Run it with your own database, your own keys, and your own
          retention rules before letting anyone else use it.
        </p>
      </div>
    </div>
  );
}
