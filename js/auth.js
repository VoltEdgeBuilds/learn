import { supabase } from "./supabase.js";

document.addEventListener("DOMContentLoaded", () => {
    const phoneForm = document.getElementById("phone-form");
    const signupForm = document.getElementById("signup-form");
    const pinForm = document.getElementById("pin-form");
    const loginLink = document.getElementById("login-link");
    const signupLink = document.getElementById("signup-link");

    let currentPhone = "";
    
    // Add a click listener to the "Next" button
    nextBtn.addEventListener("click", (e) => {
        // This line prevents the default button behavior, allowing us to handle it manually.
        e.preventDefault();
        
        // This line triggers the form's submit event, which your existing code already listens for.
        phoneForm.dispatchEvent(new Event('submit'));
    });

    // Handle switching between forms
    loginLink.addEventListener("click", (e) => {
        e.preventDefault();
        signupForm.classList.add("hidden");
        pinForm.classList.remove("hidden");
    });

    signupLink.addEventListener("click", (e) => {
        e.preventDefault();
        pinForm.classList.add("hidden");
        signupForm.classList.remove("hidden");
    });

    // Handle phone check
    phoneForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const phoneInput = document.getElementById("phone").value.trim();
        currentPhone = phoneInput;

        const { data, error } = await supabase
            .from("users")
            .select("*")
            .eq("phone", phoneInput)
            .single();

        if (error && error.code === "PGRST116") {
            // User not found → show signup form
            phoneForm.classList.add("hidden");
            signupForm.classList.remove("hidden");
            document.getElementById("signup-phone").value = currentPhone;
        } else if (data) {
            // User found → show PIN login form
            phoneForm.classList.add("hidden");
            pinForm.classList.remove("hidden");
        } else {
            alert("Unexpected error. Check console.");
            console.error(error);
        }
    });

    // Handle signup
    signupForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const fname = document.getElementById("fname").value.trim();
        const lname = document.getElementById("lname").value.trim();
        const email = document.getElementById("email").value.trim();
        const pin = document.getElementById("pin").value.trim();
        const confirmPin = document.getElementById("confirm-pin").value.trim();

        if (pin !== confirmPin) {
            alert("PINs do not match!");
            return;
        }

        const { error } = await supabase.from("users").insert([
            {
                first_name: fname,
                last_name: lname,
                email: email,
                phone: currentPhone,
                pin: pin,
            },
        ]);

        if (error) {
            console.error(error);
            alert("Signup failed!");
        } else {
            console.log("Signup successful ✅");
            localStorage.setItem("userPhone", currentPhone);
            window.location.href = "dashboard.html";
        }
    });

    // Handle PIN login
    pinForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const pin = document.getElementById("login-pin").value.trim();

        const { data, error } = await supabase
            .from("users")
            .select("*")
            .eq("phone", currentPhone)
            .eq("pin", pin)
            .single();

        if (data) {
            console.log("Login success ✅");
            localStorage.setItem("userPhone", currentPhone);
            window.location.href = "dashboard.html";
        } else {
            alert("Invalid PIN ❌");
            console.error(error);
        }
    });
});
