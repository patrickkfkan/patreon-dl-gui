## Proxy URL

---

The URL of the proxy server. Supports HTTP, HTTPS, SOCKS4 and SOCKS5 protocols.

The URL follows this scheme: `protocol://[username:[password]]@hostname:port`. For example:

- `http://proxy.xyz:8080`
- `socks5://user:password@socksproxy.xyz:1080`

<div class="d-inline-flex align-items-center border border-3 border-top-0 border-end-0 border-bottom-0 border-info px-2 py-1 mb-4">
  <span class="material-icons text-info me-2 fs-5">info</span>
  Web browser sessions are persistent. This means data such as login status is preserved. When you set a proxy URL, the session will be
  persisted based on the URL's hostname. In other words, if you set a new proxy URL (never been used in patreon-dl-gui), the embedded web browser will start a new session.
</div>

<div class="d-inline-flex align-items-center border border-3 border-top-0 border-end-0 border-bottom-0 border-warning px-2 py-1 mb-4">
  <span class="material-icons text-warning me-2 fs-5">warning</span>
  FFmpeg, which is required to download videos in streaming format, supports HTTP proxy only. For other types of proxy, video streams will be handled through direct connection (i.e. without proxy).
</div>
