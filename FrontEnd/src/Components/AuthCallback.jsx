import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function AuthCallback() {
    const navigate = useNavigate();

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");

        if (!code) {
            navigate("/login");
            return;
        }

        // Manda el code al backend para intercambiarlo por el access_token
        fetch("http://localhost:8081/usuario/github/callback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code }),
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.token) {
                    localStorage.setItem("token", data.token);
                    localStorage.setItem("usuario", data.usuario);
                    navigate("/panel-control");
                } else {
                    navigate("/login");
                }
            })
            .catch(() => navigate("/login"));
    }, []);

    return <div style={{ color: "white", padding: 40 }}>Autenticando con GitHub...</div>;
}