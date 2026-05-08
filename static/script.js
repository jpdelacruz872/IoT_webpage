function goto(page) {
    window.location.href = page;
}

function change_pass_visibility(input, img) {
    if (input.type === 'password') {
        input.type = 'text';
        img.innerHTML = '<img src="/static/open_eye.png">';
    }
    else {
        input.type = 'password';
        img.innerHTML = '<img src="/static/closed_eye.png">';
    }
}

const home_btn = document.getElementById('home_btn');
const services_btn = document.getElementById('services_btn');
const calendar_btn = document.getElementById('calendar_btn');
const account_btn = document.getElementById('account_btn');
const login_btn = document.getElementById('login_btn');
const logo1_btn = document.getElementById('logo_btn');
const logo2_btn = document.getElementById('name_btn');
const sign_up_btn = document.getElementById('sign_up_btn');
const sec_login_btn = document.getElementById('sec_login_btn');
const log_out_btn = document.getElementById('log_out_btn');

const input_pass = document.getElementById('input_pass');
const show_pass = document.getElementById('show_pass');

const input_pass_conf = document.getElementById('input_pass_conf');
const show_confirm_pass = document.getElementById('show_confirm_pass');

const submit_sign_up = document.getElementById('submit_sign_up');

const submit_log_in = document.getElementById('submit_log_in');

const log_in_status = localStorage.getItem('current_user');

if (log_in_status) {

    if (account_btn) {
        account_btn.style.display = 'inline-block';
    }

    if (login_btn) {
        login_btn.style.display = 'none';
    }
    } else {
        if (account_btn) {
            account_btn.style.display = 'none';
        }
        if (login_btn) {
            login_btn.style.display = 'inline-block';
        }
    }

home_btn.addEventListener('click', () => goto('/'));
services_btn.addEventListener('click', () => goto('/services'));
calendar_btn.addEventListener('click', () => goto('/calendar'));
account_btn.addEventListener('click', () => goto('/account'));
login_btn.addEventListener('click', () => goto('/log_in'));
logo1_btn.addEventListener('click', () => goto('/'));
logo2_btn.addEventListener('click', () => goto('/'));
if (sec_login_btn) {
    sec_login_btn.addEventListener('click', () => goto('/'));
}

if (sign_up_btn) {
    sign_up_btn.addEventListener('click', () => goto('/sign_up'));
}

if (log_out_btn) {
    log_out_btn.addEventListener('click', function () {
        localStorage.removeItem('current_user');
        goto('/log_in');
    });
}

if (show_pass && input_pass) {
    show_pass.addEventListener('click', function() {
        change_pass_visibility(input_pass, this);
    });
}

if (show_confirm_pass && input_pass_conf) {
    show_confirm_pass.addEventListener('click', function() {
        change_pass_visibility(input_pass_conf, this);
    });
}

if (submit_sign_up) { 
    submit_sign_up.addEventListener('click', async () => {
        const email = document.getElementById('sign_up_email').value;
        const password = document.getElementById('input_pass').value;
        const confirm_password = document.getElementById('input_pass_conf').value;
        const name = document.getElementById('name_input').value;
        const last_name = document.getElementById('last_name_input').value;
        const user_name = document.getElementById('user_name_input').value;
        const organization = document.getElementById('organization_input').value;
        const phone = document.getElementById('phone_input').value;

        if (password !== confirm_password) {
            alert("Passwords do not match")
            return;
        }

        try {
            const response = await fetch('/sign_up', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    password: password,
                    name: name,
                    last_name: last_name,
                    user_name: user_name,
                    organization: organization,
                    phone: phone,
                })
            });

            const result = await response.text();
            goto('/log_in');
        } catch (error) {
            console.error("Erorr sending data to flask", error);
        }
    });
}

if (submit_log_in) {
    submit_log_in.addEventListener('click', async () => {
        const password = document.getElementById('input_pass').value;
        const email_or_user = document.getElementById('email_or_user_input').value;

        try {
            const response = await fetch('/log_in', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    password: password,
                    email_or_user: email_or_user,
                })
            });

            if (response.ok) {
                const result = await response.json();
                const user_data = result.user;

                localStorage.setItem('current_user', JSON.stringify(user_data));

                goto('/');
            }

        } catch (error) {
            console.error("Error sending data to flask", error);
        }
    });
}

if (window.location.pathname === '/account') {
    const user_data = localStorage.getItem('current_user');

    if (user_data) {
        const user = JSON.parse(user_data);

        const display_name = document.getElementById('display_name');
        const display_role = document.getElementById('display_role');
        const display_organization = document.getElementById('display_organization');
        const display_email = document.getElementById('display_email');
        const display_institution = document.getElementById('display_institution');

        if (display_name) {
            display_name.innerText = user.first_name + ' ' + user.last_name;
        }

        if (display_organization) {
            display_organization.innerText = user.school_name;
        }

        if (display_email) {
            display_email.innerText = user.email;
        }

        if (display_institution) {
            display_institution.innerText = user.school_name;
        }
    }
}