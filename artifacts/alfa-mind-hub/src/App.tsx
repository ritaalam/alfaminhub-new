import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ClerkProvider } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { Route, Switch, Router as WouterRouter, useLocation } from "wouter";
import { WorkspaceSync } from "@/components/workspace/WorkspaceSync";
import { AlfaAIChat } from "@/components/ai/AlfaAIChat";
import { IntegrationUnavailablePage } from "@/lib/route-components";
import { Route as HomeRoute } from "@/routes/index";
import { Route as AuthRoute } from "@/routes/auth";
import { Route as ClassesRoute } from "@/routes/classes";
import { Route as IdeaLabRoute } from "@/routes/idea-lab";
import { Route as IdeasRoute } from "@/routes/ideas";
import { Route as LibraryRoute } from "@/routes/library";
import { Route as ResetPasswordRoute } from "@/routes/reset-password";
import { Route as VisualDirectionsRoute } from "@/routes/visual-directions";
import { Route as WorkspaceRoute } from "@/routes/workspace";

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#5b8970",
    colorForeground: "#34483a",
    colorMutedForeground: "#68786d",
    colorDanger: "#a64835",
    colorBackground: "#ffffff",
    colorInput: "#ffffff",
    colorInputForeground: "#34483a",
    colorNeutral: "#d9e2d7",
    fontFamily: "Karla, ui-sans-serif, system-ui, sans-serif",
    borderRadius: "0.875rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "w-[440px] max-w-full overflow-hidden rounded-3xl bg-white shadow-lg",
    card: "!border-0 !bg-transparent !shadow-none",
    footer: "!border-0 !bg-transparent !shadow-none",
  },
};

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomeRoute.component} />
      <Route path="/auth/*?" component={AuthRoute.component} />
      <Route path="/classes" component={ClassesRoute.component} />
      <Route path="/idea-lab" component={IdeaLabRoute.component} />
      <Route path="/ideas" component={IdeasRoute.component} />
      <Route path="/library" component={LibraryRoute.component} />
      <Route path="/reset-password" component={ResetPasswordRoute.component} />
      <Route path="/visual-directions" component={VisualDirectionsRoute.component} />
      <Route path="/workspace" component={WorkspaceRoute.component} />
      <Route path="/mcp" component={IntegrationUnavailablePage} />
      <Route path="/.mcp/:rest*" component={IntegrationUnavailablePage} />
      <Route path="/.well-known/:rest*" component={IntegrationUnavailablePage} />
      <Route path="/.lovable/:rest*" component={IntegrationUnavailablePage} />
      <Route path="/lovable/:rest*" component={IntegrationUnavailablePage} />
      <Route component={IntegrationUnavailablePage} />
    </Switch>
  );
}

function ClerkApp() {
  const [, setLocation] = useLocation();

  function stripBase(path: string) {
    return basePath && path.startsWith(basePath)
      ? path.slice(basePath.length) || "/"
      : path;
  }

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/auth`}
      signUpUrl={`${basePath}/auth`}
      routerPush={(path) => setLocation(stripBase(path))}
      routerReplace={(path) => setLocation(stripBase(path), { replace: true })}
    >
      <a href="#main-content" className="skip-link no-print">
        Skip to main content
      </a>
      <Router />
      <WorkspaceSync />
      <AlfaAIChat />
    </ClerkProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={basePath}>
        <ClerkApp />
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
