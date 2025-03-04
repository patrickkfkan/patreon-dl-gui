## Proxy URL

---

The URL of the proxy server. Supports HTTP, HTTPS, SOCKS4 and SOCKS5 protocols.

The URL follows this scheme: `protocol://[username:[password]]@hostname:port`. For example:

- `http://proxy.xyz:8080`
- `socks5://user:password@socksproxy.xyz:1080`

<div class="d-inline-flex align-items-center border border-3 border-top-0 border-end-0 border-bottom-0 border-info px-2 py-1 mb-4">
  <span class="material-icons text-info me-2 fs-5">info</span>
  You are advised to use the same proxy settings in the provided browser to ensure consistency of captured values.
</div>

<div class="d-inline-flex align-items-center border border-3 border-top-0 border-end-0 border-bottom-0 border-warning px-2 py-1 mb-4">
  <span class="material-icons text-warning me-2 fs-5">warning</span>
  FFmpeg, which is required to download videos in streaming format, supports HTTP proxy only. If the URL points to another type of proxy, video streams will be handled without passing through the proxy.
</div>
