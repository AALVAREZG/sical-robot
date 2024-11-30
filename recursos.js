const exportToJson = async () => {
    setLoading(true);
    setStatusMessage('Creando json...')
    // Filter applications to ignore those without 'partida' or 'importe' equal to 0
    const filteredApplications = formData.applications.filter(app => app.partida && app.importe !== 0);
    const jsonData = {
      //fecha_ingreso: formData.date ? formData.date.toLocaleDateString('es-ES') : '',
      fecha_ingreso: formData.date ? formatDateToDDMMYYYY(formData.date) : '',
      caja: formData.caja,
      tercero: formData.tercero,
      naturaleza: formData.naturaleza,
      final: [
        ...filteredApplications.map(app => ({
          partida: app.partida,
          IMPORTE_PARTIDA: app.importe
        })),
        { partida: "Total", IMPORTE_PARTIDA: 0.0 }
      ],
      texto_sical: [{ tcargo: formData.description, ado: "" }]
    };
  
    const total = jsonData.final.reduce((sum, item) => sum + (item.IMPORTE_PARTIDA || 0), 0) - jsonData.final[jsonData.final.length - 1].IMPORTE_PARTIDA;
    jsonData.final[jsonData.final.length - 1].IMPORTE_PARTIDA = total;
  
    try {
      const response = await axios.post('http://localhost:3008/api/arqueo', jsonData);
      if (response.status === 200) {
        //console.log('response...:'+ JSON.stringify(response.data, null, 2));
        setStatusMessage('Finalizado: Operación añadida: ' + JSON.stringify(response.data.filename, null, 2));
        setSeverityMessage('success')
      } else {
        setStatusMessage('Error: Failed to export data');
        setSeverityMessage('error')
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      setStatusMessage(`Error: Failed to export data - ${error.message}`);
      setSeverityMessage('error')
    } finally {
      setLoading(false);
    }
  };
  
  const confirmExport = () => {
    confirmDialog({
        header: 'Confirmar',
        icon: 'pi pi-exclamation-triangle',
        message: (
            <div className="flex flex-column align-items-center w-full gap-3 border-bottom-1 surface-border">
                
                <span>Una nueva operacion se añadirá a la cola: </span>
                <JsonTable data={formData} className="message-table"/>
            </div>
  
        ),
        accept: () => {
            exportToJson()
        },
        reject: () => {
            setStatusMessage('Cancelado. Operación no añadida')
            setSeverityMessage('warn')
            
        }
    })}