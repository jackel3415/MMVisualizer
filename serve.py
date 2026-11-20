"""Optional local preview server for public calendar feeds that block browser CORS.

Run python serve.py, then open http://127.0.0.1:8765/MMVisualizer.html.
Uses only the Python standard library. No config, tokens or URLs go to a public proxy.
"""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit, parse_qs
from urllib.request import Request, urlopen, HTTPRedirectHandler, build_opener
import ipaddress
import socket
import argparse


def public_url(url):
    parsed = urlsplit(url)
    if parsed.scheme not in ("https", "http") or not parsed.hostname or parsed.username or parsed.password:
        raise ValueError("Only public HTTP(S) feed URLs are supported")
    if parsed.port not in (None, 80, 443):
        raise ValueError("Only standard HTTP(S) ports are supported")
    addresses = socket.getaddrinfo(parsed.hostname, parsed.port or 443, type=socket.SOCK_STREAM)
    if not addresses or any(not ipaddress.ip_address(a[4][0]).is_global for a in addresses):
        raise ValueError("The feed must use a public address")
    return url


class PublicRedirect(HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, msg, headers, newurl):
        public_url(newurl)
        return super().redirect_request(request, fp, code, msg, headers, newurl)


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(Path(__file__).parent), **kwargs)

    def do_GET(self):
        route = urlsplit(self.path)
        if route.path != "/api/feed":
            return super().do_GET()
        expected = f"127.0.0.1:{self.server.server_port}"
        origin = self.headers.get("Origin")
        if (self.headers.get("Host") != expected or self.headers.get("X-MMV-Preview") != "1"
                or (origin and origin != "http://" + expected)
                or self.headers.get("Sec-Fetch-Site", "same-origin") not in ("same-origin", "none")):
            return self.send_error(403, "Open this preview from its local server")
        try:
            url = public_url(parse_qs(route.query).get("url", [""])[0])
            request = Request(url, headers={"User-Agent": "MMVisualizer/1.0 (local calendar preview)", "Accept": "text/calendar,text/plain"})
            with build_opener(PublicRedirect()).open(request, timeout=8) as response:
                content = response.read(2 * 1024 * 1024 + 1)
            if len(content) > 2 * 1024 * 1024:
                raise ValueError("Feed exceeds the 2 MB preview limit")
            if b"BEGIN:VCALENDAR" not in content:
                raise ValueError("The URL did not return an iCalendar feed")
            self.send_response(200)
            self.send_header("Content-Type", "text/calendar; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Content-Length", str(len(content)))
            self.end_headers()
            self.wfile.write(content)
        except Exception:
            self.send_error(502, "Calendar unavailable; check its iCal URL or use sample data")

    def log_message(self, fmt, *args):
        # Do not log query strings: calendar URLs may carry access tokens.
        if urlsplit(self.path).path == "/api/feed":
            return
        super().log_message(fmt, *args)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()
    print(f"MMVisualizer: http://127.0.0.1:{args.port}/MMVisualizer.html", flush=True)
    ThreadingHTTPServer(("127.0.0.1", args.port), Handler).serve_forever()
