#!/usr/bin/env python3
"""Serve the playground and its local preview status endpoint using only stdlib."""
import argparse
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit


class DemoHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(Path(__file__).resolve().parent.parent), **kwargs)

    def do_GET(self):
        if urlsplit(self.path).path == '/api/chatbot-status':
            body = b'{"available":true}'
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        else:
            super().do_GET()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8000)
    args = parser.parse_args()
    server = ThreadingHTTPServer(('127.0.0.1', args.port), DemoHandler)
    print(f'Design playground: http://localhost:{args.port}/demo.html', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()
