    let itemsData = [];
    let filteredItems = [];
    let currentPage = 1;
    const itemsPerPage = 20;
    let sortOrder = 'asc';

    async function fetchData() {
        const itemResponse = await fetch('https://prices.runescape.wiki/api/v1/osrs/mapping');
        const priceResponse = await fetch('https://prices.runescape.wiki/api/v1/osrs/latest');
        
        const items = await itemResponse.json();
        const prices = await priceResponse.json();

        itemsData = items.map(item => {
            const priceInfo = prices.data[item.id];
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
                limit: item.limit || 0  // Añadido el límite de cantidad
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

        const quantity = parseInt(document.getElementById('quantity').value) || 1;  // Obtener la cantidad

        currentItems.forEach(item => {
            const totalGain = item.gain * quantity;  // Calcular la ganancia total en función de la cantidad

            const itemDiv = document.createElement('div');
            itemDiv.classList.add('item');
            itemDiv.innerHTML = `
                <img src="${item.imageUrl}" alt="${item.name}">
                <div class="item-info">
                    <strong>${item.name}</strong>
                    <p><strong>Precio Bajo:</strong> ${item.low ? item.low.toLocaleString() : "No disponible"} </p>
                    <p><span><small>Última actualización: ${item.lowLastUpdated}</small></span></p>
                    <p><strong>Precio Alto:</strong> ${item.high ? item.high.toLocaleString() : "No disponible"}<p>
                    <p><span><small>Última actualización: ${item.highLastUpdated}</small></span></p>
                    <!-- Aquí se muestra la cantidad máxima de compra -->
                    <p><strong>Cantidad máxima de compra:</strong> ${item.limit}</p>
                    <!-- Y al final se muestra la ganancia -->
                    <p><strong>Ganancia:</strong> <span class="${totalGain >= 0 ? 'positive' : 'negative'}">${totalGain >= 0 ? "+" : ""}${totalGain.toLocaleString()}</span></p>
                </div>
            `;
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

    // Aquí es donde corregí la función filterItems
    function filterItems() {
        const query = document.getElementById('search').value.toLowerCase();
        const minGain = parseFloat(document.getElementById('minGain').value);
        const maxGain = parseFloat(document.getElementById('maxGain').value);
        const minPrice = parseFloat(document.getElementById('minPrice').value);
        const maxPrice = parseFloat(document.getElementById('maxPrice').value);
        const quantity = parseInt(document.getElementById('quantity').value) || 1;
        const minLimit = parseInt(document.getElementById('minLimit').value) || 0;
        const maxLimit = parseInt(document.getElementById('maxLimit').value) || Infinity;

        // Filtrar elementos de acuerdo a los criterios
        filteredItems = itemsData.filter(item => {
            const matchesName = item.name.toLowerCase().includes(query);  // Filtro por nombre
            const matchesGain = (isNaN(minGain) || item.gain >= minGain) && (isNaN(maxGain) || item.gain <= maxGain);
            const matchesPrice = (isNaN(minPrice) || item.low >= minPrice) && (isNaN(maxPrice) || item.high <= maxPrice);
            const matchesQuantity = item.limit >= minLimit && item.limit <= maxLimit;

            return matchesName && matchesGain && matchesPrice && matchesQuantity;
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

    fetchData();
