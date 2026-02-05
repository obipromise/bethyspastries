(function ($) {
    "use strict";

    // ==============================================
    // 1. GLOBAL VARIABLES AND INITIALIZATION
    // ==============================================

    // Cart data structure
    let cart = {
        items: [],
        coupon: null,
        campaign: {
            freeDeliveryThreshold: 500,
            freeCookieThreshold: 500,
            active: true,
            code: "FRESHBAKE24"
        }
    };

    // Order data
    let currentOrder = {
        items: [],
        subtotal: 0,
        delivery: 0,
        tax: 0,
        total: 0
    };

    // User session
    let userSession = {
        isLoggedIn: false,
        name: "",
        email: ""
    };

    // ==============================================
    // 2. CORE UTILITY FUNCTIONS
    // ==============================================

    // Spinner
    var spinner = function () {
        setTimeout(function () {
            if ($('#spinner').length > 0) {
                $('#spinner').removeClass('show');
            }
        }, 1);
    };
    spinner(0);

    // Show toast notification
    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `custom-toast alert alert-${type} alert-dismissible fade show`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'} me-2"></i> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.getElementById('toastContainer').appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('hide');
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.remove();
                }
            }, 300);
        }, 3000);
    }

    // Format currency
    function formatCurrency(amount) {
        return new Intl.NumberFormat('en-ET', {
            style: 'currency',
            currency: 'ETB',
            minimumFractionDigits: 0
        }).format(amount).replace('ETB', 'Birr');
    }

    // ==============================================
    // 3. CART MANAGEMENT SYSTEM
    // ==============================================

    // Initialize cart
    function initializeCart() {
        loadCartFromStorage();
        updateCartDisplay();
        setupCartEventListeners();
    }

    // Load cart from localStorage
    function loadCartFromStorage() {
        try {
            const savedCart = localStorage.getItem('bethysCart');
            if (savedCart) {
                const parsed = JSON.parse(savedCart);
                if (parsed.items && Array.isArray(parsed.items)) {
                    cart.items = parsed.items;
                }
            }
        } catch (e) {
            console.log('No saved cart found');
        }
    }

    // Save cart to localStorage
    function saveCartToStorage() {
        localStorage.setItem('bethysCart', JSON.stringify(cart));
    }

    // Add item to cart
    function addToCart(itemId, name, price, image, quantity = 1) {
        const existingItem = cart.items.find(item => item.id === itemId);
        
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            cart.items.push({
                id: itemId,
                name: name,
                price: price,
                quantity: quantity,
                image: image,
                addedAt: new Date().toISOString()
            });
        }
        
        saveCartToStorage();
        updateCartDisplay();
        showToast(`${name} added to cart!`);
        
        // Trigger add-to-cart animation
        animateAddToCart();
    }

    // Remove item from cart
    function removeFromCart(itemId) {
        cart.items = cart.items.filter(item => item.id !== itemId);
        saveCartToStorage();
        updateCartDisplay();
    }

    // Update item quantity
    function updateCartQuantity(itemId, newQuantity) {
        const item = cart.items.find(item => item.id === itemId);
        if (item) {
            if (newQuantity <= 0) {
                removeFromCart(itemId);
            } else {
                item.quantity = newQuantity;
                saveCartToStorage();
                updateCartDisplay();
            }
        }
    }

    // Clear cart
    function clearCart() {
        if (cart.items.length > 0 && confirm('Clear all items from your cart?')) {
            cart.items = [];
            saveCartToStorage();
            updateCartDisplay();
            showToast('Cart cleared successfully', 'info');
        }
    }

    // Update cart display
    function updateCartDisplay() {
        const cartCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
        
        // Update all cart count elements
        $('[id*="cartCount"], [id*="mobileCartCount"]').text(cartCount);
        
        // Update cart page if exists
        if ($('#cartTable').length) {
            renderCartTable();
            updateCartTotals();
        }
        
        // Update checkout page if exists
        if ($('#orderSummary').length) {
            renderOrderSummary();
            updateOrderTotals();
        }
    }

    // Render cart table
    function renderCartTable() {
        const cartTable = $('#cartItems');
        const emptyMessage = $('#emptyCartMessage');
        
        if (cart.items.length === 0) {
            $('#cartTable').addClass('d-none');
            emptyMessage.removeClass('d-none');
            $('#campaignProgress, #suggestedItems').addClass('d-none');
            return;
        }
        
        $('#cartTable').removeClass('d-none');
        emptyMessage.addClass('d-none');
        $('#campaignProgress, #suggestedItems').removeClass('d-none');
        
        cartTable.empty();
        
        cart.items.forEach(item => {
            const total = item.price * item.quantity;
            cartTable.append(`
                <tr id="item${item.id}">
                    <th scope="row">
                        <div class="d-flex align-items-center">
                            <img src="${item.image}" class="img-fluid me-3 rounded" style="width: 80px; height: 80px; object-fit: cover;" alt="${item.name}">
                        </div>
                    </th>
                    <td>
                        <p class="mb-0 mt-4 fw-bold">${item.name}</p>
                        <small class="text-muted">Freshly baked daily</small>
                    </td>
                    <td>
                        <p class="mb-0 mt-4 fw-bold">${formatCurrency(item.price)}</p>
                    </td>
                    <td>
                        <div class="input-group quantity mt-4" style="width: 130px;">
                            <button class="btn btn-sm btn-minus rounded-circle bg-light border" data-id="${item.id}">
                                <i class="fa fa-minus text-primary"></i>
                            </button>
                            <input type="text" class="form-control form-control-sm text-center border-0" value="${item.quantity}" id="quantity${item.id}" readonly>
                            <button class="btn btn-sm btn-plus rounded-circle bg-light border" data-id="${item.id}">
                                <i class="fa fa-plus text-primary"></i>
                            </button>
                        </div>
                    </td>
                    <td>
                        <p class="mb-0 mt-4 fw-bold" id="total${item.id}">${formatCurrency(total)}</p>
                    </td>
                    <td>
                        <button class="btn btn-md rounded-circle bg-light border mt-4" data-id="${item.id}" onclick="removeItem(${item.id})">
                            <i class="fa fa-times text-danger"></i>
                        </button>
                    </td>
                </tr>
            `);
        });
        
        updateCartTotals();
    }

    // Update cart totals
    function updateCartTotals() {
        const subtotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const deliveryFee = subtotal >= cart.campaign.freeDeliveryThreshold ? 0 : 50;
        let discount = 0;
        
        if (cart.coupon) {
            if (cart.coupon.type === 'percentage') {
                discount = subtotal * (cart.coupon.value / 100);
            } else if (cart.coupon.type === 'fixed') {
                discount = cart.coupon.value;
            }
        }
        
        const grandTotal = subtotal - discount + deliveryFee;
        
        $('#subtotal').html(`${formatCurrency(subtotal)}`);
        $('#deliveryFee').html(deliveryFee === 0 ? 'FREE' : formatCurrency(deliveryFee));
        $('#grandTotal').html(`${formatCurrency(grandTotal)}`);
        
        // Update campaign progress
        updateCampaignProgress(subtotal);
        
        // Update coupon display
        if (discount > 0) {
            $('#couponDiscountRow').removeClass('d-none');
            $('#couponDiscount').html(`-${formatCurrency(discount)}`);
        } else {
            $('#couponDiscountRow').addClass('d-none');
        }
    }

    // Apply coupon code
    function applyCoupon() {
        const code = $('#couponCode').val().trim().toUpperCase();
        const messageElement = $('#couponMessage');
        
        const validCoupons = {
            'FRESHBAKE24': { type: 'percentage', value: 10, message: '10% off your entire order!' },
            'WELCOME10': { type: 'percentage', value: 10, message: 'Welcome discount applied!' },
            'FREEDELIVERY': { type: 'fixed', value: 50, message: 'Free delivery applied!' },
            'BAKERYLOVE': { type: 'percentage', value: 15, message: '15% discount for loyal customers!' },
            'SEASONAL20': { type: 'percentage', value: 20, message: 'Seasonal special - 20% off!' }
        };
        
        if (!code) {
            messageElement.html('<span class="text-danger">Please enter a coupon code</span>');
            return;
        }
        
        if (validCoupons[code]) {
            cart.coupon = validCoupons[code];
            messageElement.html(`<span class="text-success"><i class="fas fa-check-circle me-1"></i> ${validCoupons[code].message}</span>`);
            saveCartToStorage();
            updateCartDisplay();
        } else {
            messageElement.html('<span class="text-danger"><i class="fas fa-times-circle me-1"></i> Invalid coupon code</span>');
            cart.coupon = null;
            updateCartDisplay();
        }
    }

    // Update campaign progress
    function updateCampaignProgress(subtotal) {
        const progressElement = $('#deliveryProgress');
        const progressText = $('#progressText');
        const deliveryMessage = $('#deliveryMessage');
        
        if (subtotal >= cart.campaign.freeDeliveryThreshold) {
            progressElement.css('width', '100%').removeClass('bg-warning').addClass('bg-success');
            progressText.text(`${subtotal}/500 Birr`);
            deliveryMessage.html('<i class="fas fa-check-circle me-1"></i> You\'ve earned FREE delivery!').removeClass('text-warning').addClass('text-success');
        } else {
            const progressPercent = (subtotal / cart.campaign.freeDeliveryThreshold) * 100;
            progressElement.css('width', `${progressPercent}%`).removeClass('bg-success').addClass('bg-warning');
            progressText.text(`${subtotal}/500 Birr`);
            deliveryMessage.html(`<i class="fas fa-info-circle me-1"></i> Add ${cart.campaign.freeDeliveryThreshold - subtotal} Birr more for FREE delivery`).removeClass('text-success').addClass('text-warning');
        }
    }

    // ==============================================
    // 4. MOBILE SIDEBAR FUNCTIONALITY
    // ==============================================

    function initializeMobileSidebar() {
        const mobileToggler = $('#mobileToggler');
        const sidebarClose = $('#sidebarClose');
        const mobileSidebar = $('#mobileSidebar');
        const sidebarBackdrop = $('#sidebarBackdrop');
        
        mobileToggler.on('click', function() {
            mobileSidebar.addClass('show');
            sidebarBackdrop.addClass('show');
            $('body').css('overflow', 'hidden');
            mobileToggler.attr('aria-expanded', 'true');
        });
        
        function closeSidebar() {
            mobileSidebar.removeClass('show');
            sidebarBackdrop.removeClass('show');
            $('body').css('overflow', '');
            mobileToggler.attr('aria-expanded', 'false');
        }
        
        sidebarClose.on('click', closeSidebar);
        sidebarBackdrop.on('click', closeSidebar);
        
        $('.sidebar-nav .nav-link').on('click', closeSidebar);
    }

    // ==============================================
    // 5. CHECKOUT FUNCTIONALITY
    // ==============================================

    function initializeCheckout() {
        // Set minimum delivery date
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        $('#deliveryDate').attr('min', tomorrow.toISOString().split('T')[0]);
        
        // Load order from cart
        loadOrderFromCart();
        
        // Setup checkout event listeners
        setupCheckoutEventListeners();
        
        // Initialize order summary
        updateOrderSummary();
    }

    function loadOrderFromCart() {
        currentOrder.items = [...cart.items];
        calculateOrderTotals();
    }

    function calculateOrderTotals() {
        currentOrder.subtotal = currentOrder.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        currentOrder.delivery = currentOrder.subtotal >= 500 ? 0 : 50;
        currentOrder.tax = 0; // No tax for now
        currentOrder.total = currentOrder.subtotal + currentOrder.delivery + currentOrder.tax;
    }

    function updateOrderSummary() {
        const orderSummary = $('#orderSummary');
        orderSummary.empty();
        
        currentOrder.items.forEach(item => {
            orderSummary.append(`
                <tr>
                    <td class="py-3">
                        <div class="d-flex align-items-center">
                            <img src="${item.image}" class="img-fluid rounded me-3" style="width: 60px; height: 60px; object-fit: cover;" alt="${item.name}">
                            <div>
                                <p class="mb-1 fw-bold">${item.name}</p>
                                <small class="text-muted">Qty: ${item.quantity}</small>
                            </div>
                        </div>
                    </td>
                    <td class="py-3 text-end">${formatCurrency(item.price * item.quantity)}</td>
                </tr>
            `);
        });
        
        updateOrderTotals();
    }

    function updateOrderTotals() {
        calculateOrderTotals();
        
        $('#subtotalAmount').text(formatCurrency(currentOrder.subtotal));
        $('#deliveryAmount').text(currentOrder.delivery === 0 ? 'FREE' : formatCurrency(currentOrder.delivery));
        $('#taxAmount').text(formatCurrency(currentOrder.tax));
        $('#totalAmount').text(formatCurrency(currentOrder.total));
    }

    function processOrder(event) {
        event.preventDefault();
        
        // Validate form
        if (!validateCheckoutForm()) {
            return false;
        }
        
        // Process order
        const submitBtn = $('#placeOrderBtn');
        submitBtn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin me-2"></i> Processing...');
        
        setTimeout(() => {
            const orderNumber = 'BAKERY' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 1000)).padStart(3, '0');
            
            // Show success modal
            $('#orderNumber').text(`#${orderNumber}`);
            const estimatedDelivery = getDeliveryEstimate($('#deliveryDate').val(), $('#deliveryTime').val());
            $('#estimatedDelivery').text(estimatedDelivery);
            
            const orderSuccessModal = new bootstrap.Modal(document.getElementById('orderSuccessModal'));
            orderSuccessModal.show();
            
            // Clear cart
            cart.items = [];
            saveCartToStorage();
            updateCartDisplay();
            
            // Reset button
            submitBtn.prop('disabled', false).html('<i class="fas fa-lock me-2"></i> Place Order Securely');
            
            showToast(`Order #${orderNumber} confirmed! Delivery scheduled for ${estimatedDelivery}`);
            
        }, 2000);
        
        return false;
    }

    function validateCheckoutForm() {
        const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'address', 'subcity'];
        
        for (const field of requiredFields) {
            const value = $(`#${field}`).val().trim();
            if (!value) {
                showToast(`Please fill in ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`, 'danger');
                $(`#${field}`).focus();
                return false;
            }
        }
        
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test($('#email').val())) {
            showToast('Please enter a valid email address', 'danger');
            return false;
        }
        
        if (!$('#terms').is(':checked')) {
            showToast('Please accept the Terms & Conditions', 'danger');
            return false;
        }
        
        return true;
    }

    function getDeliveryEstimate(date, timeSlot) {
        const dateObj = new Date(date);
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const formattedDate = dateObj.toLocaleDateString('en-US', options);
        
        const timeMap = {
            '9-12': '9:00 AM - 12:00 PM',
            '12-3': '12:00 PM - 3:00 PM',
            '3-6': '3:00 PM - 6:00 PM',
            '6-8': '6:00 PM - 8:00 PM'
        };
        
        return `${formattedDate}, ${timeMap[timeSlot] || 'your selected time'}`;
    }

    // ==============================================
    // 6. PRODUCT FEATURES & ANIMATIONS
    // ==============================================

    // Initialize product features
    function initializeProductFeatures() {
        // Quick add to cart buttons
        $(document).on('click', '.quick-add-btn', function() {
            const productCard = $(this).closest('.product-card');
            const productId = productCard.data('id');
            const productName = productCard.data('name');
            const productPrice = productCard.data('price');
            const productImage = productCard.data('image');
            
            addToCart(productId, productName, productPrice, productImage);
        });
        
        // Product filter
        $('.category-filter').on('click', function(e) {
            e.preventDefault();
            const category = $(this).data('category');
            filterProducts(category);
        });
        
        // Initialize countdown timer for seasonal offers
        initializeCountdownTimer();
    }

    function filterProducts(category) {
        $('.category-filter').removeClass('active');
        $(`.category-filter[data-category="${category}"]`).addClass('active');
        
        if (category === 'all') {
            $('.product-card').show();
        } else {
            $('.product-card').each(function() {
                const productCategory = $(this).data('category');
                $(this).toggle(productCategory === category);
            });
        }
    }

    function initializeCountdownTimer() {
        const timerElement = $('#seasonalTimer');
        if (!timerElement.length) return;
        
        const endDate = new Date();
        endDate.setHours(23, 59, 59); // End of today
        
        function updateTimer() {
            const now = new Date();
            const diff = endDate - now;
            
            if (diff <= 0) {
                timerElement.html('Offer expired!');
                return;
            }
            
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            
            timerElement.html(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        }
        
        updateTimer();
        setInterval(updateTimer, 1000);
    }

    function animateAddToCart() {
        // Create flying element
        const flyingItem = $('<div class="flying-item"></div>');
        flyingItem.css({
            position: 'fixed',
            top: '50%',
            left: '50%',
            width: '50px',
            height: '50px',
            background: 'var(--bs-primary)',
            borderRadius: '50%',
            zIndex: '9999',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none'
        });
        
        $('body').append(flyingItem);
        
        // Animate to cart
        flyingItem.animate({
            top: '100px',
            left: '95%',
            width: '20px',
            height: '20px',
            opacity: 0.5
        }, 800, function() {
            $(this).remove();
        });
    }

    // ==============================================
    // 7. EVENT LISTENER SETUP
    // ==============================================

    function setupCartEventListeners() {
        // Quantity buttons
        $(document).on('click', '.btn-plus', function() {
            const itemId = $(this).data('id');
            const item = cart.items.find(item => item.id == itemId);
            if (item) {
                updateCartQuantity(itemId, item.quantity + 1);
            }
        });
        
        $(document).on('click', '.btn-minus', function() {
            const itemId = $(this).data('id');
            const item = cart.items.find(item => item.id == itemId);
            if (item && item.quantity > 1) {
                updateCartQuantity(itemId, item.quantity - 1);
            }
        });
        
        // Remove item
        $(document).on('click', '[onclick*="removeItem"]', function() {
            const itemId = $(this).data('id');
            if (confirm('Remove this item from cart?')) {
                removeFromCart(itemId);
            }
        });
        
        // Apply coupon
        $('#applyCouponBtn').on('click', applyCoupon);
        $('#couponCode').on('keypress', function(e) {
            if (e.which === 13) {
                applyCoupon();
            }
        });
        
        // Clear cart
        $('#clearCartBtn').on('click', clearCart);
    }

    function setupCheckoutEventListeners() {
        // Same as billing checkbox
        $('#sameAsBilling').on('change', function() {
            if ($(this).is(':checked')) {
                $('#deliveryAddress').val($('#billingAddress').val());
                $('#deliverySubcity').val($('#billingSubcity').val());
            }
        });
        
        // Payment method changes
        $('input[name="paymentMethod"]').on('change', function() {
            const bankDetails = $('#bankDetails');
            if ($(this).val() === 'bank') {
                bankDetails.show();
            } else {
                bankDetails.hide();
            }
        });
        
        // Form submission
        $('#checkoutForm').on('submit', processOrder);
        
        // Phone number formatting
        $('#phone').on('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 0) {
                if (!value.startsWith('+251') && !value.startsWith('251')) {
                    if (value.startsWith('0')) {
                        value = '+251' + value.substring(1);
                    } else {
                        value = '+251' + value;
                    }
                }
            }
            e.target.value = value;
        });
    }

    // ==============================================
    // 8. PAGE-SPECIFIC INITIALIZATION
    // ==============================================

    function initializePage() {
        const path = window.location.pathname;
        const page = path.split("/").pop();
        
        // Initialize common features
        initializeCart();
        initializeMobileSidebar();
        
        // Page-specific initialization
        switch(page) {
            case 'index.html':
            case '':
                initializeHomePage();
                break;
            case 'shop.html':
                initializeShopPage();
                break;
            case 'cart.html':
                initializeCartPage();
                break;
            case 'checkout.html':
                initializeCheckoutPage();
                break;
            case 'contact.html':
                initializeContactPage();
                break;
        }
    }

    function initializeHomePage() {
        initializeProductFeatures();
        setupHomePageEventListeners();
        
        // Initialize seasonal offers
        if ($('#seasonalOffers').length) {
            loadSeasonalOffers();
        }
        
        // Initialize featured products slider
        if ($('.featured-slider').length) {
            initializeFeaturedSlider();
        }
    }

    function initializeShopPage() {
        initializeProductFeatures();
        setupShopPageEventListeners();
        
        // Initialize product filtering
        $('.category-tab').on('click', function(e) {
            e.preventDefault();
            const tabId = $(this).attr('href');
            $('.category-tab').removeClass('active');
            $(this).addClass('active');
            $('.tab-pane').removeClass('show active');
            $(tabId).addClass('show active');
        });
    }

    function initializeCartPage() {
        // Already initialized by initializeCart()
    }

    function initializeCheckoutPage() {
        initializeCheckout();
    }

    function initializeContactPage() {
        $('#contactForm').on('submit', function(e) {
            e.preventDefault();
            
            // Simple validation
            const name = $('#contactName').val().trim();
            const email = $('#contactEmail').val().trim();
            const message = $('#contactMessage').val().trim();
            
            if (!name || !email || !message) {
                showToast('Please fill in all fields', 'danger');
                return;
            }
            
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                showToast('Please enter a valid email address', 'danger');
                return;
            }
            
            // Simulate sending message
            $('#contactForm').addClass('was-validated');
            showToast('Thank you for your message! We\'ll get back to you soon.', 'success');
            $('#contactForm')[0].reset();
            $('#contactForm').removeClass('was-validated');
        });
    }

    // ==============================================
    // 9. EXTRA SURPRISE FEATURES
    // ==============================================

    // Daily special
    function showDailySpecial() {
        const dailySpecials = [
            {
                name: "Chocolate Fudge Cake",
                description: "Today's special - 15% off!",
                price: 382,
                originalPrice: 450,
                image: "img/cake-item-1.jpg"
            },
            {
                name: "French Macarons",
                description: "Buy 1 pack, get 1 free!",
                price: 280,
                originalPrice: 560,
                image: "img/macaron-item-1.avif"
            },
            {
                name: "Assorted Donuts",
                description: "Morning special - 20% off!",
                price: 120,
                originalPrice: 150,
                image: "img/promo-1.jpg"
            }
        ];
        
        const today = new Date().getDate();
        const special = dailySpecials[today % dailySpecials.length];
        
        if ($('#dailySpecial').length) {
            $('#dailySpecial').html(`
                <div class="seasonal-banner p-4 text-white">
                    <div class="discount-badge">${Math.round((1 - special.price/special.originalPrice) * 100)}%</div>
                    <h4><i class="fas fa-crown me-2"></i> Today's Special</h4>
                    <h3 class="mb-2">${special.name}</h3>
                    <p class="mb-3">${special.description}</p>
                    <div class="d-flex align-items-center justify-content-between">
                        <div>
                            <span class="text-decoration-line-through me-2">${formatCurrency(special.originalPrice)}</span>
                            <span class="h4 mb-0">${formatCurrency(special.price)}</span>
                        </div>
                        <button class="btn btn-light" onclick="addToCart('daily-special', '${special.name}', ${special.price}, '${special.image}')">
                            <i class="fas fa-shopping-cart me-2"></i> Add to Cart
                        </button>
                    </div>
                </div>
            `);
        }
    }

    // Baking status indicator
    function showBakingStatus() {
        const bakingStatus = [
            { status: "Fresh from oven", time: "Just now", icon: "fa-fire" },
            { status: "Baking now", time: "15 min ago", icon: "fa-utensils" },
            { status: "Preparing", time: "30 min ago", icon: "fa-clock" }
        ];
        
        const status = bakingStatus[Math.floor(Math.random() * bakingStatus.length)];
        
        if ($('#bakingStatus').length) {
            $('#bakingStatus').html(`
                <div class="baking-timer">
                    <i class="fas ${status.icon} fa-2x mb-3"></i>
                    <h5 class="mb-2">${status.status}</h5>
                    <p class="mb-0"><small>Last update: ${status.time}</small></p>
                </div>
            `);
        }
    }

    // Flavor of the week
    function showFlavorOfTheWeek() {
        const flavors = [
            { name: "Salted Caramel", color: "#D4A574", icon: "fa-candy-cane" },
            { name: "Matcha Green Tea", color: "#6B8E23", icon: "fa-leaf" },
            { name: "Red Velvet", color: "#DC143C", icon: "fa-heart" },
            { name: "Lemon Zest", color: "#FFD700", icon: "fa-lemon" }
        ];
        
        const weekNumber = Math.floor(new Date().getDate() / 7);
        const flavor = flavors[weekNumber % flavors.length];
        
        if ($('#flavorOfTheWeek').length) {
            $('#flavorOfTheWeek').html(`
                <div class="text-center p-4 border rounded" style="background-color: ${flavor.color}15; border-color: ${flavor.color}30 !important;">
                    <i class="fas ${flavor.icon} fa-3x mb-3" style="color: ${flavor.color};"></i>
                    <h4 class="mb-2">Flavor of the Week</h4>
                    <h3 class="mb-3" style="color: ${flavor.color};">${flavor.name}</h3>
                    <p class="mb-0">Try our special ${flavor.name.toLowerCase()} pastries this week!</p>
                </div>
            `);
        }
    }

    // ==============================================
    // 10. BOOTSTRAP COMPONENTS & ANIMATIONS
    // ==============================================

    // Fixed Navbar
    $(window).scroll(function () {
        if ($(window).width() < 992) {
            if ($(this).scrollTop() > 55) {
                $('.fixed-top').addClass('shadow');
            } else {
                $('.fixed-top').removeClass('shadow');
            }
        } else {
            if ($(this).scrollTop() > 55) {
                $('.fixed-top').addClass('shadow').css('top', -55);
            } else {
                $('.fixed-top').removeClass('shadow').css('top', 0);
            }
        } 
    });
    
    // Back to top button
    $(window).scroll(function () {
        if ($(this).scrollTop() > 300) {
            $('.back-to-top').fadeIn('slow');
        } else {
            $('.back-to-top').fadeOut('slow');
        }
    });
    
    $('.back-to-top').click(function () {
        $('html, body').animate({scrollTop: 0}, 1500, 'easeInOutExpo');
        return false;
    });

    // Product carousel
    $(".vegetable-carousel").owlCarousel({
        autoplay: true,
        smartSpeed: 1500,
        center: false,
        dots: true,
        loop: true,
        margin: 25,
        nav: true,
        navText: [
            '<i class="bi bi-arrow-left"></i>',
            '<i class="bi bi-arrow-right"></i>'
        ],
        responsiveClass: true,
        responsive: {
            0: { items: 1 },
            576: { items: 1 },
            768: { items: 2 },
            992: { items: 3 },
            1200: { items: 4 }
        }
    });

    // Featured products carousel
    function initializeFeaturedSlider() {
        $(".featured-slider").owlCarousel({
            autoplay: true,
            smartSpeed: 1000,
            center: true,
            dots: false,
            loop: true,
            margin: 20,
            nav: true,
            navText: [
                '<i class="fas fa-chevron-left"></i>',
                '<i class="fas fa-chevron-right"></i>'
            ],
            responsiveClass: true,
            responsive: {
                0: { items: 1 },
                768: { items: 2 },
                992: { items: 3 },
                1200: { items: 4 }
            }
        });
    }

    // Modal Video
    $(document).ready(function () {
        var $videoSrc;
        $('.btn-play').click(function () {
            $videoSrc = $(this).data("src");
        });

        $('#videoModal').on('shown.bs.modal', function (e) {
            $("#video").attr('src', $videoSrc + "?autoplay=1&amp;modestbranding=1&amp;showinfo=0");
        });

        $('#videoModal').on('hide.bs.modal', function (e) {
            $("#video").attr('src', $videoSrc);
        });
    });

    // ==============================================
    // 11. ADDITIONAL HELPER FUNCTIONS
    // ==============================================

    // Global functions for HTML onclick attributes
    window.addToCart = addToCart;
    window.removeItem = removeFromCart;
    window.updateQuantity = updateCartQuantity;
    window.applyCoupon = applyCoupon;
    window.clearCart = clearCart;
    window.processOrder = processOrder;

    // Newsletter subscription
    window.subscribeNewsletter = function() {
        const email = $('#newsletterEmail').val().trim();
        if (email && email.includes('@')) {
            showToast('Thank you for subscribing to our newsletter!');
            $('#newsletterEmail').val('');
        } else {
            showToast('Please enter a valid email address', 'danger');
        }
    };

    // Quick view modal
    function showQuickView(productId) {
        // This would normally fetch product details from an API
        const products = {
            1: {
                name: "Chocolate Fudge Cake",
                description: "Rich chocolate cake with creamy fudge frosting, perfect for celebrations. Made with premium Belgian chocolate and fresh cream.",
                price: 450,
                image: "img/cake-item-1.jpg",
                ingredients: ["Belgian Chocolate", "Fresh Cream", "Butter", "Flour", "Eggs", "Sugar"],
                allergens: ["Gluten", "Dairy", "Eggs"],
                weight: "1.5kg",
                serves: "8-10 people"
            }
        };
        
        const product = products[productId];
        if (product) {
            $('#quickViewModal .modal-title').text(product.name);
            $('#quickViewModal .product-image').attr('src', product.image);
            $('#quickViewModal .product-description').text(product.description);
            $('#quickViewModal .product-price').text(formatCurrency(product.price));
            $('#quickViewModal .product-weight').text(product.weight);
            $('#quickViewModal .product-serves').text(product.serves);
            
            const ingredientsList = $('#quickViewModal .product-ingredients');
            ingredientsList.empty();
            product.ingredients.forEach(ing => {
                ingredientsList.append(`<span class="flavor-tag">${ing}</span>`);
            });
            
            const quickViewModal = new bootstrap.Modal(document.getElementById('quickViewModal'));
            quickViewModal.show();
        }
    }

    // ==============================================
    // 12. INITIALIZATION ON DOCUMENT READY
    // ==============================================

    $(document).ready(function() {
        initializePage();
        
        // Load extra features after a delay
        setTimeout(() => {
            showDailySpecial();
            showBakingStatus();
            showFlavorOfTheWeek();
        }, 1000);
        
        // Initialize tooltips
        $('[data-bs-toggle="tooltip"]').tooltip();
        
        // Initialize popovers
        $('[data-bs-toggle="popover"]').popover();
    });

})(jQuery);

// Global helper functions
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

function setCookie(name, value, days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = `expires=${date.toUTCString()}`;
    document.cookie = `${name}=${value};${expires};path=/`;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}