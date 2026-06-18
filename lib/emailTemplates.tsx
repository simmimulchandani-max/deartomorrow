import React from "react";

type UnlockEmailTemplateProps = {
  heading: string;
  line: string;
  ctaLabel: string;
  ctaUrl: string;
};

const styles = {
  body: {
    margin: 0,
    padding: 0,
    backgroundColor: "#f5f0e6",
    fontFamily: "Georgia, 'Times New Roman', serif",
    color: "#4a3c31",
  } as const,
  wrapper: {
    width: "100%",
    padding: "28px 14px",
    boxSizing: "border-box" as const,
  },
  card: {
    maxWidth: "560px",
    margin: "0 auto",
    backgroundColor: "#fffaf2",
    border: "1px solid #eadfce",
    borderRadius: "20px",
    padding: "28px 24px",
    boxSizing: "border-box" as const,
    boxShadow: "0 8px 22px rgba(74, 60, 49, 0.06)",
  },
  eyebrow: {
    margin: "0 0 12px 0",
    fontSize: "12px",
    letterSpacing: "0.16em",
    textTransform: "uppercase" as const,
    color: "#8a786d",
    fontWeight: 600,
  },
  heading: {
    margin: "0",
    fontSize: "34px",
    lineHeight: 1.1,
    fontWeight: 600,
    color: "#4a3c31",
  },
  text: {
    margin: "16px 0 0 0",
    fontSize: "17px",
    lineHeight: 1.6,
    color: "#5b4d43",
  },
  buttonWrap: {
    marginTop: "26px",
  },
  button: {
    display: "inline-block",
    backgroundColor: "#f7c7b6",
    border: "1px solid #e7b6a4",
    borderRadius: "999px",
    padding: "12px 22px",
    color: "#4a3c31",
    textDecoration: "none",
    fontWeight: 700,
    fontSize: "14px",
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
  },
  footer: {
    marginTop: "24px",
    fontSize: "14px",
    lineHeight: 1.6,
    color: "#7a695f",
  },
} as const;

function UnlockEmailTemplate({
  heading,
  line,
  ctaLabel,
  ctaUrl,
}: UnlockEmailTemplateProps) {
  return (
    <html>
      <body style={styles.body}>
        <div style={styles.wrapper}>
          <div style={styles.card}>
            <p style={styles.eyebrow}>Until Tomorrow</p>
            <h1 style={styles.heading}>{heading}</h1>
            <p style={styles.text}>{line}</p>
            <div style={styles.buttonWrap}>
              <a href={ctaUrl} style={styles.button}>
                {ctaLabel}
              </a>
            </div>
            <p style={styles.footer}>
              With care,
              <br />
              Until Tomorrow
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}

export function buildMemoryUnlockEmailTemplate(link: string) {
  return {
    react: (
      <UnlockEmailTemplate
        heading="Your memory is ready."
        line="Your memory in Until Tomorrow is ready to be unlocked. Click below to revisit the moment you saved for yourself."
        ctaLabel="Unlock My Memory"
        ctaUrl={link}
      />
    ),
    text: [
      "Your memory in Until Tomorrow is ready to be unlocked.",
      "",
      "Click below to revisit the moment you saved for yourself.",
      "",
      `Unlock My Memory: ${link}`,
      "",
      "With care,",
      "Until Tomorrow",
    ].join("\n"),
  };
}

export function buildCapsuleUnlockEmailTemplate(link: string) {
  return {
    react: (
      <UnlockEmailTemplate
        heading="Your capsule is ready to unlock."
        line="The memories gathered for you are ready whenever you are."
        ctaLabel="Unlock Capsule"
        ctaUrl={link}
      />
    ),
    text: [
      "Your capsule is ready to unlock.",
      "",
      "The memories gathered for you are ready whenever you are.",
      "",
      `Unlock capsule: ${link}`,
      "",
      "With care,",
      "Until Tomorrow",
    ].join("\n"),
  };
}
