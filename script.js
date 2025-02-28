    let itemsData = [];
    let filteredItems = [];
    let currentPage = 1;
    const itemsPerPage = 20;
    let sortOrder = 'asc';

    // Variable para el modal
    let modalItemId = null;
    let modalTimeInterval = '5m';
    let modalChartInstance = null;

    async function fetchData() {
      const itemResponse = await fetch('https://prices.runescape.wiki/api/v1/osrs/mapping');
      const priceResponse = await fetch('https://prices.runescape.wiki/api/v1/osrs/latest');
      
      const items = await itemResponse.json();
      const prices = await priceResponse.json();

      itemsData = items.map(item => {
        const priceInfo = prices.data ? prices.data[item.id] : prices[item.id];
        const highPrice = priceInfo ? priceInfo.high : null;
        const lowPrice = priceInfo ? priceInfo.low : null;
        const gain = highPrice ? Math.round((highPrice * 0.99) - lowPrice) : 0;
        const highLastUpdated = priceInfo && priceInfo.highTime ? new Date(priceInfo.highTime * 1000).toLocaleString() : "No disponible";
        const lowLastUpdated = priceInfo && priceInfo.lowTime ? new Date(priceInfo.lowTime * 1000).toLocaleString() : "No disponible";

        return {
          ...item,
          high: highPrice,
          low: lowPrice,
          gain: gain,
          highLastUpdated: highLastUpdated,
          lowLastUpdated: lowLastUpdated,
          imageUrl: `https://oldschool.runescape.wiki/images/${formatImageName(item.name)}_detail.png`,
          limit: item.limit || 0,
          id: item.id
        };
      });

      filteredItems = [...itemsData];
      renderItems();
    }

    function formatImageName(name) {
      return name.replace(/\s+/g, '_').replace(/^([a-zA-Z])/, match => match.toUpperCase());
    }

    function renderItems() {
      const itemsList = document.getElementById('itemsList');
      itemsList.innerHTML = '';

      const startIdx = (currentPage - 1) * itemsPerPage;
      const endIdx = currentPage * itemsPerPage;
      const currentItems = filteredItems.slice(startIdx, endIdx);

      const quantity = parseInt(document.getElementById('quantity').value) || 1;

      currentItems.forEach(item => {
        const totalGain = item.gain * quantity;

        const itemDiv = document.createElement('div');
        itemDiv.classList.add('item');
        itemDiv.innerHTML = `
          <img src="${item.imageUrl}" alt="${item.name}">
          <div class="item-info">
            <strong>${item.name}</strong>
            <p><strong>Precio Bajo:</strong> ${item.low ? item.low.toLocaleString() : "No disponible"}</p>
            <p><span><small>Última actualización: ${item.lowLastUpdated}</small></span></p>
            <p><strong>Precio Alto:</strong> ${item.high ? item.high.toLocaleString() : "No disponible"}<p>
            <p><span><small>Última actualización: ${item.highLastUpdated}</small></span></p>
            <p><strong>Cantidad máxima de compra:</strong> ${item.limit}</p>
            <p><strong>Ganancia:</strong> <span class="${totalGain >= 0 ? 'positive' : 'negative'}">${totalGain >= 0 ? "+" : ""}${totalGain.toLocaleString()}</span></p>
          </div>
        `;
        // Al hacer clic en el item, se abre el modal con el gráfico
        itemDiv.addEventListener('click', () => openModal(item));
        itemsList.appendChild(itemDiv);
      });

      updatePagination();
    }

    function updatePagination() {
      const prevBtn = document.getElementById('prevBtn');
      const nextBtn = document.getElementById('nextBtn');

      prevBtn.disabled = currentPage === 1;
      nextBtn.disabled = currentPage * itemsPerPage >= filteredItems.length;
    }

    function changePage(direction) {
      currentPage += direction;
      renderItems();
    }

    function filterItems() {
      const query = document.getElementById('search').value.toLowerCase();
      const minGain = parseFloat(document.getElementById('minGain').value);
      const maxGain = parseFloat(document.getElementById('maxGain').value);
      const minPrice = parseFloat(document.getElementById('minPrice').value);
      const maxPrice = parseFloat(document.getElementById('maxPrice').value);
      const quantity = parseInt(document.getElementById('quantity').value) || 1;
      const minLimit = parseInt(document.getElementById('minLimit').value) || 0;
      const maxLimit = parseInt(document.getElementById('maxLimit').value) || Infinity;

      filteredItems = itemsData.filter(item => {
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesGain = (isNaN(minGain) || item.gain >= minGain) && (isNaN(maxGain) || item.gain <= maxGain);
        const matchesPrice = (isNaN(minPrice) || item.low >= minPrice) && (isNaN(maxPrice) || item.high <= maxPrice);
        const matchesLimit = item.limit >= minLimit && item.limit <= maxLimit;

        return matchesName && matchesGain && matchesPrice && matchesLimit;
      });

      sortItems(sortOrder);
    }

    function sortItems(order) {
      sortOrder = order;
      if (order === 'asc') {
        filteredItems.sort((a, b) => a.gain - b.gain);
      } else if (order === 'desc') {
        filteredItems.sort((a, b) => b.gain - a.gain);
      }
      renderItems();
    }

    function toggleSortOrder() {
      if (sortOrder === 'asc') {
        sortOrder = 'desc';
        document.getElementById('sortText').innerText = 'Mayor a Menor';
      } else {
        sortOrder = 'asc';
        document.getElementById('sortText').innerText = 'Menor a Mayor';
      }
      sortItems(sortOrder);
    }

    function clearFilters() {
      document.getElementById('search').value = '';
      document.getElementById('minGain').value = '';
      document.getElementById('maxGain').value = '';
      document.getElementById('minPrice').value = '';
      document.getElementById('maxPrice').value = '';
      document.getElementById('quantity').value = '';
      document.getElementById('minLimit').value = '';
      document.getElementById('maxLimit').value = '';

      filteredItems = [...itemsData];
      sortOrder = 'asc';
      document.getElementById('sortText').innerText = 'Menor a Mayor';
      renderItems();
    }

    // Función para abrir el modal con el gráfico expandido
    function openModal(item) {
      modalItemId = item.id;
      modalTimeInterval = '5m'; // Intervalo por defecto
      document.getElementById('modalItemName').innerText = item.name;
      // Abrir el modal
      document.getElementById('chartModal').style.display = 'block';
      // Cargar el gráfico y el volumen
      fetchModalChart(modalItemId, modalTimeInterval);
      fetchVolume(modalItemId);
    }

    // Cerrar el modal
    document.getElementById('modalClose').addEventListener('click', () => {
      document.getElementById('chartModal').style.display = 'none';
      // Si hay un gráfico modal ya creado, destruirlo
      if (modalChartInstance) {
        modalChartInstance.destroy();
        modalChartInstance = null;
      }
    });

    // Función para cambiar el intervalo de tiempo del gráfico en el modal
    function changeModalTimeInterval(interval) {
      modalTimeInterval = interval;
      fetchModalChart(modalItemId, modalTimeInterval);
    }

    // Función para obtener los datos de la API para el modal
    async function fetchModalChart(id, timestep) {
      const url = `https://prices.runescape.wiki/api/v1/osrs/timeseries?timestep=${timestep}&id=${id}`;
      try {
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          const pricesData = data.data;
          const timestamps = pricesData.map(entry => new Date(entry.timestamp * 1000).toLocaleString());
          const highPrices = pricesData.map(entry => entry.avgHighPrice);
          const lowPrices = pricesData.map(entry => entry.avgLowPrice);
          renderModalChart(timestamps, highPrices, lowPrices);
        } else {
          console.error('Error al obtener los datos del modal:', response.statusText);
        }
      } catch (error) {
        console.error('Error en la solicitud del modal:', error);
      }
    }

		 // Función para renderizar el gráfico en el modal
		function renderModalChart(timestamps, highPrices, lowPrices) {
		  const ctx = document.getElementById('modalChart').getContext('2d');
		  if (modalChartInstance) {
			modalChartInstance.destroy();
		  }
		  modalChartInstance = new Chart(ctx, {
			type: 'line',  // Tipo de gráfico: línea
			data: {
			  labels: timestamps,  // Etiquetas (fechas, horas)
			  datasets: [{
				label: 'Precio Alto',
				data: highPrices,
				borderColor: 'green',
				fill: false,  // No llenar el área bajo la línea
				lineTension: 0.1,  // Suaviza la línea
				spanGaps: true  // Conecta los puntos faltantes con una línea recta
			  }, {
				label: 'Precio Bajo',
				data: lowPrices,
				borderColor: 'red',
				fill: false,  // No llenar el área bajo la línea
				lineTension: 0.1,  // Suaviza la línea
				spanGaps: true  // Conecta los puntos faltantes con una línea recta
			  }]
			},
			options: {
			  responsive: true,
			  plugins: {
				tooltip: {
				  mode: 'index',  // Muestra todos los tooltips en la misma posición
				  intersect: false,  // Muestra el tooltip aunque no estés sobre un punto
				  callbacks: {
					title: function(tooltipItems) {
					  return 'Precio en ' + tooltipItems[0].label;  // Muestra la fecha u hora
					},
					label: function(tooltipItem) {
					  const datasetLabel = tooltipItem.dataset.label;
					  const price = tooltipItem.raw;
					  return `${datasetLabel}: ${price} GP`;
					},
					afterLabel: function(tooltipItem) {
					  // Agregar el precio bajo en el tooltip
					  if (tooltipItem.datasetIndex === 0) { // Solo para el conjunto de datos de precio alto
						const lowPrice = lowPrices[tooltipItem.dataIndex];
						return `Precio Bajo: ${lowPrice} GP`;
					  }
					}
				  }
				}
			  },
			  scales: {
				x: {
				  type: 'category',
				  title: {
					display: true,
					text: 'Fecha y Hora'
				  }
				},
				y: {
				  beginAtZero: false,
				  title: {
					display: true,
					text: 'Precio'
				  }
				}
			  }
			}
		  });
}


    // Función para obtener el volumen diario desde la otra API
    async function fetchVolume(itemId) {
      try {
        const response = await fetch('https://chisel.weirdgloop.org/gazproj/gazbot/os_dump.json');
        const data = await response.json();
        const volumeData = data[itemId];
        const volumeElem = document.getElementById('volumeValue');
        if (volumeData && volumeData.volume !== undefined) {
          volumeElem.innerText = volumeData.volume.toLocaleString();
        } else {
          volumeElem.innerText = "No disponible";
        }
      } catch (error) {
        console.error("Error al obtener el volumen:", error);
        document.getElementById('volumeValue').innerText = "Error";
      }
    }

    // Llamar a fetchData al cargar la página
    window.onload = fetchData;