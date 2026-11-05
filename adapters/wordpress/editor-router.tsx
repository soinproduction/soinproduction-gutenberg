export function Link({ to, params, search, hash, activeProps, children, ...props }: any) {
  return (
    <a
      {...props}
      href="#"
      onClick={(event) => event.preventDefault()}
      onAuxClick={(event) => event.preventDefault()}
    >
      {children}
    </a>
  );
}
export function useLocation({ select }: any) {
  return select({
    pathname: '/',
  });
}
export function useBookingSearch() {
  return {};
}
export function useNavigate(_options?: any) {
  return () => {};
}

export function usePathname(){return '/';}
export function useRouter(){return {push:()=>{},replace:()=>{},refresh:()=>{}};}
