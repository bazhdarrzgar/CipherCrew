#!/usr/bin/env python3
"""Smoke-test a running Fruit Quality Detector API."""

from __future__ import annotations

import argparse
import base64
import json
import mimetypes
import sys
import urllib.error
import urllib.request
import uuid
from pathlib import Path


def request_json(url: str, data: bytes | None = None, headers: dict[str, str] | None = None) -> dict:
    request = urllib.request.Request(url, data=data, headers=headers or {})
    with urllib.request.urlopen(request, timeout=120) as response:
        return json.loads(response.read().decode("utf-8"))


def build_multipart(image_path: Path) -> tuple[bytes, str]:
    boundary = f"----fruit-detector-{uuid.uuid4().hex}"
    mime_type = mimetypes.guess_type(image_path.name)[0] or "application/octet-stream"
    image_bytes = image_path.read_bytes()

    body = b"".join(
        [
            f"--{boundary}\r\n".encode(),
            (
                f'Content-Disposition: form-data; name="file"; '
                f'filename="{image_path.name}"\r\n'
            ).encode(),
            f"Content-Type: {mime_type}\r\n\r\n".encode(),
            image_bytes,
            f"\r\n--{boundary}--\r\n".encode(),
        ]
    )
    return body, f"multipart/form-data; boundary={boundary}"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="http://127.0.0.1:8000", help="API base URL")
    parser.add_argument("--image", required=True, help="Path to a fruit image")
    parser.add_argument("--output", default="smoke-output.jpg", help="Annotated image output path")
    args = parser.parse_args()

    base_url = args.base_url.rstrip("/")
    image_path = Path(args.image).expanduser()
    output_path = Path(args.output).expanduser()

    if not image_path.exists():
        print(f"Image does not exist: {image_path}", file=sys.stderr)
        return 2

    try:
        health = request_json(f"{base_url}/health")
        print("Health:", health.get("status"))

        body, content_type = build_multipart(image_path)
        result = request_json(
            f"{base_url}/detect?return_gradcam=true",
            data=body,
            headers={"Content-Type": content_type},
        )
    except urllib.error.HTTPError as exc:
        print(exc.read().decode("utf-8", errors="replace"), file=sys.stderr)
        return 1
    except Exception as exc:
        print(f"Smoke test failed: {exc}", file=sys.stderr)
        return 1

    if not result.get("detections"):
        print("No detections returned.", file=sys.stderr)
        return 1

    output_path.write_bytes(base64.b64decode(result["annotated_image"]))
    first = result["detections"][0]
    overall = result.get("overall") or first
    print(
        json.dumps(
            {
                "total": result.get("total"),
                "summary": result.get("summary_labels") or result.get("summary"),
                "overall": {
                    "label": overall.get("label") or overall.get("class"),
                    "confidence": overall.get("class_conf"),
                },
                "top_detection": {
                    "label": first.get("label") or first.get("class"),
                    "confidence": first.get("class_conf"),
                    "fallback": first.get("fallback", False),
                },
                "annotated_image": str(output_path),
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
