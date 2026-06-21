const MOBILE_USER_AGENT_PATTERN =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;

export const isMobileUserAgent = (
  userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : ''
) =>
  MOBILE_USER_AGENT_PATTERN.test(userAgent);

export const useIsMobile = () => {
  if (typeof navigator === 'undefined') {
    return false;
  }

  return isMobileUserAgent(navigator.userAgent);
};
