import { RefObject, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function useRouteScrollTop(containerRef?: RefObject<HTMLElement | null>) {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });

    if (containerRef?.current) {
      containerRef.current.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
  }, [location.pathname, containerRef]);
}
