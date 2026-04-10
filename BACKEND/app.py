from flask import Flask, render_template, request, redirect, url_for, session
import sqlite3
dsvlksndvlksn defdvklsdñk{vnd{lsk soyr rodfri y estoyu modificando el backend}}
app = Flask(__name__)
app.secret_key = "clave_secreta"

def crear_db():
    with sqlite3.connect("usuarios.db") as conexion:
        cursor = conexion.cursor()

        cursor.execute(""" 
        CREATE TABLE IF NOT EXISTS usuarios (
            usuario TEXT PRIMARY KEY,
            contraseña TEXT,
            tipo TEXT
        )
        """)
        # 🔥 Crear admin si no existe
        cursor.execute(
            "INSERT OR IGNORE INTO usuarios (usuario, contraseña, tipo) VALUES (?, ?, ?)",
            ("admin", "1234", "admin")
        )


@app.route("/")
def index():
    return render_template("index.html")

@app.route("/registro", methods=["GET", "POST"])
def registro():
    if request.method == "POST":
        usuario = request.form["usuario"]
        contraseña = request.form["contraseña"]

        conexion = sqlite3.connect("usuarios.db")
        cursor = conexion.cursor()

        cursor.execute(
            "INSERT INTO usuarios (usuario,contraseña,tipo) VALUES (?, ?, ?)",
            (usuario, contraseña, "normal")
        )
        
        conexion.commit()
        conexion.close()

        session["usuario"] = usuario
        return redirect(url_for("bienvenida", nombre=usuario))

    return render_template("registro.html")

@app.route("/invitado")
def invitado():
    return redirect(url_for("bienvenida", nombre="Invitado"))

@app.route("/bienvenida/<nombre>")
def bienvenida(nombre):
    conexion = sqlite3.connect("usuarios.db")
    cursor = conexion.cursor()

    cursor.execute("SELECT tipo FROM usuarios WHERE usuario=?", (nombre,))
    resultado = cursor.fetchone()
    conexion.close()

    if resultado:
        tipo = resultado[0]
    else:
        tipo = "Invitado"
    return render_template("bienvenida.html", nombre=nombre, tipo=tipo)

@app.route("/admin")
def admin():
    usuario = session.get("usuario")

    if not usuario:
        return "No has iniciado sesión ❌"
    
    conexion = sqlite3.connect("usuarios.db")
    cursor = conexion.cursor()

    cursor.execute("SELECT tipo FROM usuarios WHERE usuario =?", (usuario,))
    resultado = cursor.fetchone()

    if not resultado or resultado[0] != "admin":
        conexion.close()
        return "Acceso denegado 🚫"

    # 🔥 Obtener lista de usuarios
    cursor.execute("SELECT usuario, tipo FROM usuarios")
    lista_usuarios = cursor.fetchall()

    conexion.close()

    return render_template("admin.html", usuario=usuario, usuarios=lista_usuarios)

@app.route("/hacer_admin/<usuario_objetivo>")
def hacer_admin(usuario_objetivo):
    usuario_actual = session.get("usuario")

    if not usuario_actual:
        return "No has iniciado sesión ❌"

    conexion = sqlite3.connect("usuarios.db")
    cursor = conexion.cursor()

    # Verificar si es admin
    cursor.execute("SELECT tipo FROM usuarios WHERE usuario=?", (usuario_actual,))
    resultado = cursor.fetchone()

    if not resultado or resultado[0] != "admin":
        conexion.close()
        return "No tienes permisos 🚫"

    # Verificar si el usuario existe
    cursor.execute("SELECT * FROM usuarios WHERE usuario=?", (usuario_objetivo,))
    existe = cursor.fetchone()

    if existe:
        cursor.execute(
            "UPDATE usuarios SET tipo='admin' WHERE usuario=?",
            (usuario_objetivo,)
        )
        conexion.commit()
        conexion.close()
        return f"{usuario_objetivo} ahora es admin 👑"

    conexion.close()
    return "Usuario no encontrado ❌"

@app.route("/login", methods=["GET", "POST"])
def login():
    error = None

    if request.method == "POST":
        usuario = request.form["usuario"]
        contraseña = request.form["contraseña"]

        conexion = sqlite3.connect("usuarios.db")
        cursor = conexion.cursor()

        cursor.execute(
            "SELECT * FROM usuarios WHERE usuario =? AND contraseña=?",
            (usuario, contraseña)            
        )

        resultado = cursor.fetchone()
        conexion.close()

        if resultado:
            session["usuario"] = usuario
            return redirect(url_for("bienvenida", nombre=usuario))
        else:
            return "Usuario o contraseña incorrectos ❌"

    return render_template("login.html")

@app.route("/logout")
def logout():
    session.pop("usuario", None)
    return redirect(url_for("index"))

if __name__ == "__main__":
    crear_db()
    app.run(host="0.0.0.0", port=5000, debug=True)