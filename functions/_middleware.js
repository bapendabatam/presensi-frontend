export async function onRequest({ request, next, env }) {
	const url = new URL(request.url);
	// redirect admin
	if (url.pathname === "/admin" || url.pathname === "/admin/") {
		const target = new URL("/admin/login/", url.origin).toString();
		return Response.redirect(target, 302);
	}

	return next();
}

