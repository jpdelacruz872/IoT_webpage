function goto(page) {
    window.location.href = page;
}

function change_pass_visibility(input, img) {
    if (input.type === 'password') {
        input.type = 'text';
        img.innerHTML = '<img src="open_eye.png">';
    }
    else {
        input.type = 'password';
        img.innerHTML = '<img src="closed_eye.png">';
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

const input_pass = document.getElementById('input_pass');
const show_pass = document.getElementById('show_pass');

const input_pass_conf = document.getElementById('input_pass_conf');
const show_confirm_pass = document.getElementById('show_confirm_pass');

home_btn.addEventListener('click', () => goto('home.html'));
services_btn.addEventListener('click', () => goto('services.html'));
calendar_btn.addEventListener('click', () => goto('calendar.html'));
account_btn.addEventListener('click', () => goto('account.html'));
login_btn.addEventListener('click', () => goto('index.html'));
logo1_btn.addEventListener('click', () => goto('home.html'));
logo2_btn.addEventListener('click', () => goto('home.html'));
if (sec_login_btn) {
    sec_login_btn.addEventListener('click', () => goto('index.html'));
}

if (sign_up_btn) {
    sign_up_btn.addEventListener('click', () => goto('sign_up.html'));
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