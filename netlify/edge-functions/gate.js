const COOKIE_NAME = "normie_gate_ok";

async function makeToken(secret) {
  const data = new TextEncoder().encode(`allowed:${secret}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function loginPage(errorMessage = "") {
  return new Response(
    `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Gatekeeping in Progress</title>
  <style>
    body {
      font-family: system-ui, sans-serif;
      display: grid;
      place-items: center;
      min-height: 100vh;
      margin: 0;
      background: #111;
      color: #eee;
    }
    form {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      width: 100%;
      max-width: 320px;
      padding: 1.5rem;
      border: 1px solid #333;
      border-radius: 8px;
      background: #1a1a1a;
    }
    input, button {
      padding: 0.6rem 0.75rem;
      font-size: 1rem;
      border-radius: 6px;
      border: 1px solid #444;
    }
    input {
      background: #111;
      color: #fff;
    }
    button {
      background: #fff;
      color: #111;
      font-weight: 600;
      cursor: pointer;
    }
    .error {
      color: #ff6b6b;
      font-size: 0.9rem;
      margin: 0;
    }
  </style>
</head>
<body>
  <form method="POST">
    <h1 style="font-size:1.1rem;margin:0;">Enter Password</h1>
    ${errorMessage ? `<p class="error">${errorMessage}</p>` : ""}
    <input type="password" name="password" placeholder="Password" required autofocus />
    <button type="submit">Unlock</button>
  </form>
</body>
</html>`,
    {
      status: 401,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      },
    }
  );
}

export default async function handler(request, context) {
  const expectedPassword = Netlify.env.get("SECRET_PAGE_PASSWORD");

  if (!expectedPassword) {
    return new Response("SECRET_PAGE_PASSWORD is not set in Netlify environment variables.", {
      status: 500,
    });
  }

  const expectedToken = await makeToken(expectedPassword);

  if (request.method === "POST") {
    const formData = await request.formData().catch(() => null);
    const submittedPassword = formData?.get("password");

    if (typeof submittedPassword === "string" && submittedPassword === expectedPassword) {
      context.cookies.set({
        name: COOKIE_NAME,
        value: expectedToken,
        path: "/apsara.html",
        httpOnly: true,
        sameSite: "Lax",
        secure: true,
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });

      // Redirect to GET so refreshing doesn't re-submit the form
      return Response.redirect(request.url, 303);
    }

    return loginPage("Wrong password.");
  }

  const cookieValue = context.cookies.get(COOKIE_NAME);
  if (cookieValue === expectedToken) {
    return context.next();
  }

  return loginPage();
}
