// src/components/footer/Footer.jsx
import React from 'react';
// Importa el componente Link de react-router-dom si los enlaces internos deben usarlo
// import { Link } from 'react-router-dom';

// Importa el CSS para el footer.
// Puedes importar tus archivos CSS globales existentes:
import '../../styles/styles.css'; // Asegúrate que la ruta sea correcta
import '../../styles/styles1.css'; // Asegúrate que la ruta sea correcta
// O si creas un archivo CSS específico para el footer:
// import './Footer.css';
// O si usas CSS Modules:
// import styles from './Footer.module.css'; // Y usarías className={styles.footer} etc.

// Asegúrate de tener FontAwesome configurado en tu proyecto React
// Si usas la versión gratuita via CDN, asegúrate que el enlace <link> esté en public/index.html
// Si usas la versión con paquetes npm (@fortawesome/react-fontawesome), necesitas importarlos y usarlos como componentes.
// Para este ejemplo, asumimos que las clases 'fab' y 'fas' funcionan (ej: via CDN en public/index.html).

function Footer() {
  // Puedes agregar lógica aquí si el footer tuviera partes dinámicas (ej: año actual)
  const currentYear = new Date().getFullYear();

  // Lógica para el enlace "Volver arriba" (opcional, requiere JS)
  // const handleBackToTop = (event) => {
  //   event.preventDefault(); // Previene el comportamiento por defecto del enlace #
  //   window.scrollTo({
  //     top: 0,
  //     behavior: 'smooth' // Para un desplazamiento suave
  //   });
  // };

  return (
    // {/* Inicio del Footer - Comentario convertido a JSX */}
    <footer className="footer"> {/* Cambia 'class' por 'className' */}
      {/* Si footer-wave es un elemento visual que se renderiza así: */}
      {/* <div className="footer-wave"></div> */}
      {/* Si es un pseudo-elemento CSS, no necesitas este div */}

      <div className="footer-content">
        <div className="footer-section logo-section">
          <h2>Nova Salud</h2>
          <p>Tu bienestar, nuestra misión. Tecnología y atención personalizada para tu salud.</p>
          <div className="social-icons">
            {/* Cambia 'class' por 'className' */}
            {/* Usa <a> con href="#" si son placeholders o enlaces externos.
                Si son enlaces internos que no recargan la página, usa el componente <Link to="..."> de react-router-dom */}
            <a href="#" aria-label="Facebook"><i className="fab fa-facebook-f"></i></a>
            <a href="#" aria-label="Instagram"><i className="fab fa-instagram"></i></a>
            <a href="#" aria-label="WhatsApp"><i className="fab fa-whatsapp"></i></a>
            <a href="#" aria-label="LinkedIn"><i className="fab fa-linkedin-in"></i></a>
          </div>
        </div>

        <div className="footer-section links-section">
          <h3>Enlaces Rápidos</h3>
          <ul>
             {/* Usa <a> con href="#" o <Link> si son rutas internas */}
            <li><a href="#">Inicio</a></li> {/* Podrías usar <Link to="/">Inicio</Link> */}
            <li><a href="#">Servicios</a></li> {/* Podrías usar <Link to="/servicios">Servicios</Link> */}
            <li><a href="#">Citas</a></li> {/* Podrías usar <Link to="/citas">Citas</Link> */}
            <li><a href="#">Contáctanos</a></li> {/* Podrías usar <Link to="/contacto">Contáctanos</Link> */}
            <li><a href="#">Blog</a></li> {/* Podrías usar <Link to="/blog">Blog</Link> */}
          </ul>
        </div>

        <div className="footer-section legal-section">
          <h3>Legal</h3>
          <ul>
             {/* Usa <a> con href="#" o <Link> si son rutas internas */}
            <li><a href="#">Política de Privacidad</a></li>
            <li><a href="#">Términos y Condiciones</a></li>
            <li><a href="#">Soporte Técnico</a></li>
            <li><a href="#">Cookies</a></li>
          </ul>
        </div>

        <div className="footer-section contact-section">
          <h3>Contacto</h3>
          {/* Cambia 'class' por 'className' para los íconos */}
          {/* Asumiendo que 'fas' es la clase para íconos FontAwesome Solid */}
          <p><i className="fas fa-map-marker-alt"></i> Villa María del Triunfo, Lima, Perú</p>
          <p><i className="fas fa-phone-alt"></i> +51 987 654 321</p>
          <p><i className="fas fa-envelope"></i> contacto@novasalud.pe</p>
          <p><i className="fas fa-clock"></i> Horario: L-V 9am - 6pm</p>
        </div>
      </div>

      <div className="footer-bottom">
        {/* Puedes usar la variable dynamicamente para el año */}
        <p>&copy; {currentYear} Nova Salud | Todos los derechos reservados.</p>
        {/* Para el link "Volver arriba", si quieres scroll suave, añade el manejador onClick={handleBackToTop} */}
        <p><a href="#" className="back-to-top">Volver arriba</a></p>
      </div>
    </footer>
    // {/* Fin del Footer - Comentario convertido a JSX */}
  );
}

export default Footer; // Exporta el componente