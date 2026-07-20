import { auth } from "../firebase.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

window.addEventListener("DOMContentLoaded", () => {

    if (!window.ACAProfileMenu) return;

    // Logout
    ACAProfileMenu.on("logout", async () => {

        try {

            await signOut(auth);

        } catch (e) {

            console.error("Logout Failed:", e);

        }

    });
    // Login
    ACAProfileMenu.on("login", () => {

    sessionStorage.setItem(
        "redirectAfterLogin",
        window.location.pathname
    );

    window.location.href = "/login";

    });

    // Auth Listener
    onAuthStateChanged(auth, (user) => {

        if (user) {

            ACAProfileMenu.setUser({

                name: user.displayName || user.email.split("@")[0],

                email: user.email,

                photoURL: user.photoURL || "",

                plan: "free"

            });

        } else {

            ACAProfileMenu.setGuest();

        }

    });

});