const GITHUB_CLIENT_ID = "Ov23lifcAXEVo4WKXu28";    
const REDIRECT_URI = "http://localhost:5173/auth/callback";

export function iniciarLoginGithub() {
    const url = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=user:email`;
    window.location.href = url;

}