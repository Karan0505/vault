export class NextResponse extends Response {
  static override json(data: unknown, init?: ResponseInit) {
    return new Response(JSON.stringify(data), {
      ...init,
      headers: {
        "content-type": "application/json",
        ...init?.headers,
      },
    });
  }

  static override redirect(url: string | URL, status = 307) {
    return new Response(null, {
      status,
      headers: { location: typeof url === "string" ? url : url.toString() },
    });
  }
}

export class NextRequest extends Request {}
