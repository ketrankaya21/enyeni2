// Sayfa tamamen yüklendiğinde çalışacak olay dinleyicisini ekler
window.addEventListener('load', function () {
    // İlk içeriği seç
    const firstContent = document.getElementById('firstContent');

    // 2 saniye (2000 ms) sonra işlemi başlat
    setTimeout(function () {
        // firstContent öğesine 'fade-out' sınıfını ekleyerek kaybolmasını sağla
        firstContent.classList.add('fade-out');

        // 1 saniye (1000 ms) sonra tamamen gizle
        setTimeout(function () {
            firstContent.style.display = 'none';
        }, 1000);
    }, 2000);
});

