#!/usr/bin/env python3
"""Serveix el joc en local: python3 tools/serve.py [port] [--no-open]"""
import http.server, os, socketserver, sys, webbrowser
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
port = int(next((a for a in sys.argv[1:] if a.isdigit()), 8000))
class H(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, '.js': 'text/javascript', '.mjs': 'text/javascript'}
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()
    def log_message(self, *a): pass
socketserver.TCPServer.allow_reuse_address = True
with socketserver.ThreadingTCPServer(('', port), H) as httpd:
    url = f'http://localhost:{port}/'
    print(f'Saxo a {url} (Ctrl+C per aturar)')
    if '--no-open' not in sys.argv: webbrowser.open(url)
    httpd.serve_forever()
