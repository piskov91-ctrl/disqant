import type { ReactNode } from "react";

export type InstallPlatformId = "shopify" | "wordpress" | "wix" | "squarespace" | "customHtml";

export const INSTALL_PLATFORM_TABS: { id: InstallPlatformId; label: string }[] = [
  { id: "shopify", label: "Shopify" },
  { id: "wordpress", label: "WordPress" },
  { id: "wix", label: "Wix" },
  { id: "squarespace", label: "Squarespace" },
  { id: "customHtml", label: "Custom HTML" },
];

/**
 * Same copy as the retailer dashboard &ldquo;Get Code&rdquo; tab. Pass a `className` for inline `<strong>` styling
 * (dashboard uses light text on dark; marketing pages use dark text on light).
 */
export function getInstallPlatformGuide(
  strongClassName: string,
): Record<InstallPlatformId, { intro: string; steps: ReactNode[] }> {
  const k = strongClassName;
  return {
    shopify: {
      intro: "These steps are for Shopify—the place where you manage your online store.",
      steps: [
        <>
          Sign in to Shopify. On the left, click <strong className={k}>Online store</strong>. Then click{" "}
          <strong className={k}>Themes</strong>.
        </>,
        <>
          Look for the <strong className={k}>three dots</strong> next to your current theme. Click them, then click{" "}
          <strong className={k}>Edit code</strong>. On the left, under <strong className={k}>Layout</strong>, open the
          main theme file (<strong className={k}>theme.liquid</strong>—that&apos;s just the name Shopify uses; you
          don&apos;t need to understand it).
        </>,
        <>
          Scroll to the <strong className={k}>very bottom</strong> of the page you&apos;re looking at.{" "}
          <strong className={k}>Paste</strong> your Wear Me install line on a fresh line just above the last line or
          two, then click <strong className={k}>Save</strong>.
        </>,
      ],
    },

    wordpress: {
      intro:
        "These steps use a small free add-on inside WordPress so you can paste in one box—no hunting through files.",
      steps: [
        <>Sign in to your WordPress dashboard (the back end of your site).</>,
        <>
          On the left, click <strong className={k}>Plugins</strong>, then <strong className={k}>Add new</strong>. In the
          search area, type <strong className={k}>Insert Headers and Footers</strong>. Install it and click the button
          to turn it on.
        </>,
        <>
          Click <strong className={k}>Settings</strong>, then open <strong className={k}>Insert Headers and Footers</strong>.
          Look for the box meant for the <strong className={k}>bottom</strong> of the site (it may say &ldquo;footer&rdquo;).{" "}
          <strong className={k}>Paste</strong> your Wear Me install line there—not in the top box. Then save.
        </>,
      ],
    },

    wix: {
      intro: "Wix lets you add one piece of text that runs on your pages from your site settings.",
      steps: [
        <>
          Sign in to Wix and open your site&apos;s <strong className={k}>Settings</strong> area (not the visual
          drag-and-drop editor—look for site-wide settings).
        </>,
        <>
          Look for something like <strong className={k}>Custom code</strong> or extra code for your site. Click the
          button to <strong className={k}>add</strong> a new piece of code.
        </>,
        <>
          <strong className={k}>Paste</strong> your Wear Me install line into the box. When it asks where the code
          should run, pick <strong className={k}>all pages</strong> (or your whole shop) and choose the option that
          means <strong className={k}>end of the page</strong> (close to the bottom). Then apply your changes and{" "}
          <strong className={k}>publish</strong> the site so shoppers can see it.
        </>,
      ],
    },

    squarespace: {
      intro: "Squarespace has one place where you can add text that runs at the bottom of every page.",
      steps: [
        <>
          Sign in to Squarespace. Click the <strong className={k}>gear</strong> icon for{" "}
          <strong className={k}>Settings</strong>.
        </>,
        <>
          Click <strong className={k}>Advanced</strong>, then look for a setting about{" "}
          <strong className={k}>adding code to your site</strong> (Squarespace often calls it{" "}
          <strong className={k}>Code injection</strong>) and open it.
        </>,
        <>
          Find the section for the <strong className={k}>footer</strong>—the bottom area of your site, not the top.{" "}
          <strong className={k}>Paste</strong> your Wear Me line there. Click <strong className={k}>Save</strong>.
        </>,
      ],
    },

    customHtml: {
      intro: "Use this if someone else built your site in a custom way, or the options above don’t match your setup.",
      steps: [
        <>
          Find the person or team who can edit your website files, or open your site&apos;s main layout yourself if you
          already know how.
        </>,
        <>Open the layout that wraps your product pages—the file that loads on every shopping page.</>,
        <>
          Go to the bottom of that file. <strong className={k}>Paste</strong> your Wear Me install line on its own line
          just above the very end, save, and make the change live on the internet.
        </>,
      ],
    },
  };
}
