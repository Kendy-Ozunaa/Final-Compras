import { useState } from 'react';
import { Layout } from './components/Layout';
import { Home } from './components/Home';
import { Departamentos } from './components/Departamentos';
import { UnidadesMedida } from './components/UnidadesMedida';
import { Proveedores } from './components/Proveedores';
import { Articulos } from './components/Articulos';
import { OrdenesCompra } from './components/OrdenesCompra';

import AutoLogin from './components/autoLogin';   // ⬅️ IMPORTANTE




function App() {
  const [currentView, setCurrentView] = useState('home');

  const renderView = () => {
    switch (currentView) {
      case 'home':
        return <Home />;
      case 'departamentos':
        return <Departamentos />;
      case 'unidades':
        return <UnidadesMedida />;
      case 'proveedores':
        return <Proveedores />;
      case 'articulos':
        return <Articulos />;
      case 'ordenes':
        return <OrdenesCompra />;
      default:
        return <Home />;
    }
  };

  return (
    <AutoLogin>
      <Layout currentView={currentView} onNavigate={setCurrentView}>
        {renderView()}
      </Layout>
    </AutoLogin>
  );
}

export default App;
