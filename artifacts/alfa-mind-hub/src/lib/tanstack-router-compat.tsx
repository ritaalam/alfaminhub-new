import {
  Link as WouterLink,
  useLocation,
  useParams as useWouterParams,
} from "wouter";
import type { AnchorHTMLAttributes, ComponentType, ReactNode } from "react";

type NavigationTarget = {
  to: string;
  params?: Record<string, string | number>;
  search?: Record<string, string | number | boolean | undefined>;
  replace?: boolean;
};

function makeHref(target: NavigationTarget) {
  let href = target.to;
  for (const [key, value] of Object.entries(target.params ?? {})) {
    href = href.replace(`$${key}`, encodeURIComponent(String(value)));
  }
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(target.search ?? {})) {
    if (value !== undefined) search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `${href}?${query}` : href;
}

export function Link({
  to,
  params,
  search,
  activeOptions: _activeOptions,
  activeProps,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> &
  NavigationTarget & {
    activeOptions?: unknown;
    activeProps?: AnchorHTMLAttributes<HTMLAnchorElement>;
  }) {
  const [location] = useLocation();
  const href = makeHref({ to, params, search });
  const active = location === href.split("?")[0];
  const activeClassName = active ? activeProps?.className : undefined;
  return (
    <WouterLink
      href={href}
      {...props}
      {...(active ? activeProps : {})}
      className={[props.className, activeClassName].filter(Boolean).join(" ")}
    />
  );
}

export function useNavigate() {
  const [, setLocation] = useLocation();
  return ({ to, params, search, replace }: NavigationTarget) =>
    setLocation(makeHref({ to, params, search }), { replace });
}

export function createFileRoute(path: string) {
  return <T extends Record<string, unknown>>(options: T) => ({
    ...options,
    path,
    useSearch: () => {
      const params = Object.fromEntries(new URLSearchParams(window.location.search));
      const validate = options["validateSearch"];
      return typeof validate === "function" ? validate(params) : params;
    },
    useParams: () => useWouterParams(),
  });
}

export function createRootRouteWithContext<TContext>() {
  return <T extends Record<string, unknown>>(options: T) => ({
    ...options,
    useRouteContext: () => ({} as TContext),
  });
}

export function Outlet() {
  return null;
}

export function HeadContent() {
  return null;
}

export function Scripts() {
  return null;
}

export function useRouter() {
  return { invalidate: () => undefined };
}

export function redirect() {
  return null;
}

export function RouterProvider(_props: { router: unknown }) {
  return null;
}

export type RouteComponent = ComponentType;
export type RouteRecord = { component?: RouteComponent; path: string };
export type RouterContext = { children?: ReactNode };