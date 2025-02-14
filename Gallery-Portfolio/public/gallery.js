document.addEventListener('DOMContentLoaded', () => {
    let IMAGE_BASE_URL;
    let columns = 3; // Default number of columns
    let imagesPerLoad = 10; // Default images per load
    const SCROLL_THRESHOLD = 100; // Scroll threshold to start hiding the header
    let currentImageRequest = null; // Variable to hold the current image request
    let currentExifRequest = null; // Variable to hold the current EXIF request
    let isPageLoading = true; // 页面加载标志

    // Fetch configuration from server
    fetch('/config')
        .then(response => response.json())
        .then(config => {
            IMAGE_BASE_URL = config.IMAGE_BASE_URL;
            // Proceed with the rest of the logic
            initGallery();
        })
        .catch(error => console.error('Error loading config:', error));

    // 在页面加载完成后设置标志
    window.addEventListener('load', () => {
        isPageLoading = false;
    });

    function initGallery() {
        const galleryElement = document.getElementById('gallery');
        const loadMoreButton = document.getElementById('load-more');
        const loadingElement = document.getElementById('loading');
        let imageUrls = {};
        let currentIndex = 0;
        let imagesLoadedCount = 0;
        let loadingImagesCount = 0;
        let columnElements = [];
        let currentTag = 'all';

        // 创建标签栏
        function createTagFilter(tags) {
            const tagContainer = document.createElement('div');
            tagContainer.className = 'tag-filter-vertical';

            // 添加鼠标滚轮事件，实现鼠标悬停在标签栏上时通过滚轮垂直滚动标签栏
            tagContainer.addEventListener('wheel', (event) => {
                event.preventDefault();
                tagContainer.scrollTop += event.deltaY;
            });

            // 添加"全部"标签
            const allTag = document.createElement('button');
            allTag.className = 'tag';
            allTag.textContent = 'All';
            allTag.style.backgroundColor = '#ff7b00'; // 绿色主题色
            allTag.style.color = '#fff';
            allTag.addEventListener('click', () => {
                // 移除所有标签的选中样式
                tagContainer.querySelectorAll('.tag').forEach(t => {
                    t.style.backgroundColor = '';
                    t.style.color = '';
                });
                // 设置当前标签的选中样式
                allTag.style.backgroundColor = '#ff7b00';
                allTag.style.color = '#fff';
                filterImages('all');
            });
            tagContainer.appendChild(allTag);

            // 添加其他标签，排除 'preview' 文件夹
            tags.forEach(tag => {
                if (tag !== 'all' && tag !== 'preview') {
                    const tagButton = document.createElement('button');
                    tagButton.className = 'tag';
                    tagButton.textContent = tag;
                    tagButton.addEventListener('click', () => {
                        // 移除所有标签的选中样式
                        tagContainer.querySelectorAll('.tag').forEach(t => {
                            t.style.backgroundColor = '';
                            t.style.color = '';
                        });
                        // 设置当前标签的选中样式
                        tagButton.style.backgroundColor = '#ff7b00';
                        tagButton.style.color = '#fff';
                        filterImages(tag);
                    });
                    tagContainer.appendChild(tagButton);
                }
            });

            // 插入到header和gallery之间
            const header = document.querySelector('header');
            header.insertAdjacentElement('afterend', tagContainer);
        }

        // 图片筛选功能
        function filterImages(tag) {
            currentTag = tag;
            currentIndex = 0;
            imagesLoadedCount = 0;
            loadingImagesCount = 0;
            createColumns();

            // 如果是"全部"标签，显示所有图片（包括根目录和子文件夹，排除preview）
            if (tag === 'all') {
                const allImages = [];
                for (const key in imageUrls) {
                    if (key !== 'preview') {
                        allImages.push(...imageUrls[key]);
                    }
                }
                imageUrls['all'] = allImages;
            }

            // 重新分配图片到最短列
            const images = imageUrls[currentTag] || [];
            images.forEach((imageUrl, index) => {
                const img = document.createElement('img');
                img.src = imageUrl.thumbnail;
                img.alt = `Photo ${index + 1}`;
                img.classList.add('loaded');
                img.onclick = () => openModal(imageUrl.original);

                const shortestColumn = getShortestColumn();
                columnElements[shortestColumn].appendChild(img);
            });

            loadNextImages();
        }

        // 创建列元素
        function createColumns() {
            columnElements.forEach(column => galleryElement.removeChild(column));
            columnElements = [];
            for (let i = 0; i < columns; i++) {
                const column = document.createElement('div');
                column.classList.add('column');
                columnElements.push(column);
                galleryElement.appendChild(column);
            }
        }

        function updateColumns() {
            const width = window.innerWidth;
            if (width < 600) {
                columns = 2;
                imagesPerLoad = 10;
            } else if (width < 900) {
                columns = 3;
                imagesPerLoad = 15;
            } else if (width < 1200) {
                columns = 4;
                imagesPerLoad = 20;
            } else if (width < 1500) {
                columns = 5;
                imagesPerLoad = 23;
            } else {
                columns = 6;
                imagesPerLoad = 25;
            }
            createColumns();
            distributeImages();
        }

        function distributeImages() {
            columnElements.forEach(column => column.innerHTML = '');
            if (imageUrls[currentTag]) {
                imageUrls[currentTag].forEach((imageUrl, index) => {
                    const img = document.createElement('img');
                    img.src = imageUrl.thumbnail;
                    img.alt = `Photo ${index + 1}`;
                    img.classList.add('loaded'); // Assume images are loaded after initial load
                    img.onclick = () => openModal(imageUrl.original);
                    columnElements[index % columns].appendChild(img);
                });
            }
        }

        // 从服务器获取所有图片 URL
        fetch('/images')
            .then(response => response.json())
            .then(data => {
                imageUrls = data;
                createTagFilter(Object.keys(data));
                // 首次加载时自动选择 "All" 标签
                filterImages('all');
                updateColumns();
            })
            .catch(error => console.error('Error loading images:', error));

        // 获取最短列的索引
        function getShortestColumn() {
            let minIndex = 0;
            let minHeight = columnElements[0].offsetHeight;
            for (let i = 1; i < columnElements.length; i++) {
                if (columnElements[i].offsetHeight < minHeight) {
                    minHeight = columnElements[i].offsetHeight;
                    minIndex = i;
                }
            }
            return minIndex;
        }

        // 加载下一批图片
        function loadNextImages() {
            setLoadingState(true);
            const images = imageUrls[currentTag] || [];
            const endIndex = Math.min(currentIndex + imagesPerLoad, images.length);
            loadingImagesCount = endIndex - currentIndex;

            for (let i = currentIndex; i < endIndex; i++) {
                const img = document.createElement('img');
                img.src = images[i].thumbnail;
                img.alt = `Photo ${i + 1}`;

                // 获取最短列
                const shortestColumn = getShortestColumn();
                columnElements[shortestColumn].appendChild(img);

                img.onload = function () {
                    this.classList.add('loaded');
                    imagesLoadedCount++;
                    loadingImagesCount--;

                    // 检查并重新分配图片到最短列
                    const newShortestColumn = getShortestColumn();
                    if (shortestColumn !== newShortestColumn) {
                        columnElements[newShortestColumn].appendChild(this);
                    }

                    if (loadingImagesCount === 0) {
                        setLoadingState(false);
                    }
                    checkIfAllImagesLoaded();
                };

                img.onerror = () => {
                    fetch(`/thumbnail/${encodeURIComponent(images[i].original.replace(IMAGE_BASE_URL + '/', ''))}`)
                        .then(() => {
                            img.src = images[i].thumbnail;
                        })
                        .catch(error => {
                            console.error(`Error loading image: ${images[i].thumbnail}`, error);
                            loadingImagesCount--;
                            if (loadingImagesCount === 0) {
                                setLoadingState(false);
                            }
                            checkIfAllImagesLoaded();
                        });
                };

                img.onclick = function () {
                    openModal(images[i].original);
                };
            }
            currentIndex = endIndex;
            if (currentIndex >= images.length) {
                loadMoreButton.style.display = 'none';
            }
        }

        // 检查是否所有图片都加载完成
        function checkIfAllImagesLoaded() {
            const totalImagesToLoad = Math.min(currentIndex, imageUrls[currentTag].length);
            if (imagesLoadedCount >= totalImagesToLoad) {
                document.querySelector('.gallery').style.opacity = '1'; // Show gallery
                document.querySelector('footer').style.opacity = '1'; // Show footer
                loadMoreButton.style.opacity = '1'; // Show load more button
                loadingElement.classList.add('hidden'); // Hide loading animation
            }
        }

        // 设置加载按钮状态
        function setLoadingState(isLoading) {
            if (isLoading) {
                loadMoreButton.textContent = '加载中…';
                loadMoreButton.classList.add('loading');
                loadMoreButton.disabled = true;
            } else {
                loadMoreButton.textContent = '加载更多';
                loadMoreButton.classList.remove('loading');
                loadMoreButton.disabled = false;
            }
        }

        loadMoreButton.onclick = loadNextImages;

        // 动态设置 gallery 的 margin-top
        function setGalleryMarginTop() {
            const headerHeight = document.querySelector('header').offsetHeight;
            galleryElement.style.marginTop = `${headerHeight + 20}px`; // 20px 是 header 和 gallery 之间的间距
        }

        // 模态窗口逻辑
        const modal = document.getElementById('myModal');
        const modalContent = document.querySelector('.modal-content');
        const modalImg = document.getElementById('img01');
        const exifInfo = document.getElementById('exif-info');
        const span = document.getElementsByClassName('close')[0];

        function openModal(src) {
            if (isPageLoading) {
                console.log('页面正在加载，无法打开大图');
                return; // 如果页面正在加载，直接返回
            }
            // Cancel any ongoing image or EXIF requests
            if (currentImageRequest) {
                currentImageRequest.abort();
            }
            if (currentExifRequest) {
                currentExifRequest.abort();
            }

            modal.style.display = 'block';
            document.body.classList.add('no-scroll');
            exifInfo.innerHTML = 'Loading original image and EXIF data...'; // Placeholder text

            // Create a new AbortController for the current requests
            const imageController = new AbortController();
            const exifController = new AbortController();
            currentImageRequest = imageController;
            currentExifRequest = exifController;

            // Fetch EXIF data first
            fetch(`/exif/${encodeURIComponent(src.replace(IMAGE_BASE_URL + '/', ''))}`, { signal: exifController.signal })
                .then(response => response.json())
                .then(data => {
                    if (!exifController.signal.aborted) {
                        exifInfo.innerHTML = `
                            <p>光圈: ${data.FNumber ? `f/${data.FNumber}` : 'N/A'}  ·  快门: ${data.ExposureTime ? `${data.ExposureTime}s` : 'N/A'}  ·  ISO: ${data.ISO ? data.ISO : 'N/A'}</p>
                        `;
                    }
                })
                .catch(error => {
                    if (error.name !== 'AbortError') {
                        console.error('Error fetching EXIF data:', error);
                        exifInfo.innerHTML = '';
                    }
                });

            // Load the image after fetching EXIF data
            modalImg.src = src;
            modalImg.onload = () => {
                if (!imageController.signal.aborted) {
                    currentImageRequest = null; // Clear the current image request when loaded
                }
            };
            modalImg.onerror = () => {
                if (!imageController.signal.aborted) {
                    console.error('Error loading image');
                }
            };
        }

        span.onclick = function () {
            closeModal();
        }

        modalContent.onclick = function (event) {
            event.stopPropagation(); // Prevent click on image from closing modal
        }

        modal.onclick = function () {
            closeModal();
        }

        function closeModal() {
            // Abort any ongoing image or EXIF requests when closing the modal
            if (currentImageRequest) {
                currentImageRequest.abort();
            }
            if (currentExifRequest) {
                currentExifRequest.abort();
            }
            modal.style.display = 'none';
            document.body.classList.remove('no-scroll');
        }

        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') {
                closeModal();
            }
        });

        window.addEventListener('resize', () => {
            updateColumns(); // Update columns on window resize
            distributeImages(); // Re-distribute images
            setGalleryMarginTop(); // Update gallery margin-top on window resize
        });

        updateColumns(); // Initial column setup
        setGalleryMarginTop(); // Initial gallery margin-top setup

        // Hide header on scroll
    
        let lastScrollY = 0;
        let scrollDelta = 0;
        const SCROLL_THRESHOLD = 50; // 多少像素后隐藏 header
        const AUTO_SCROLL_SPEED = 2; // 自动滚动速度（像素/帧）
        let isScrollingDown = true; // 控制滚动方向
        let isLoading = false; // 是否正在加载更多内容
        
        function autoScroll() {
            if (isScrollingDown) {
                // 向下滚动
                window.scrollBy(0, AUTO_SCROLL_SPEED);
        
                // 检测是否滚动到底部
                if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight) {
                    if (!isLoading) {
                        isLoading = true;
                        loadMoreButton.click(); // 触发加载更多
        
                        setTimeout(() => {
                            isLoading = false;
                            // 确保新内容加载完成后才开始返回顶部
                            isScrollingDown = false;
                        }, 2000); // 等待加载完成，时间可以根据实际情况调整
                    }
                }
            } else {
                // 向上滚动
                window.scrollBy(0, -AUTO_SCROLL_SPEED);
        
                // 回到顶部后再次开始向下滚动
                if (window.scrollY <= 0) {
                    isScrollingDown = true;
                }
            }
        }
        
        setInterval(autoScroll, 16); // 16ms 约等于 60FPS
        
        window.addEventListener('scroll', () => {
            const currentScrollY = window.scrollY;
            const header = document.querySelector('header');
        
            if (currentScrollY === 0) {
                header.style.transform = 'translateY(0)';
            } else if (currentScrollY > lastScrollY) {
                scrollDelta += currentScrollY - lastScrollY;
                if (scrollDelta > SCROLL_THRESHOLD) {
                    header.style.transform = 'translateY(-100%)';
                }
            } else {
                scrollDelta = 0;
                header.style.transform = 'translateY(0)';
            }
        
            lastScrollY = currentScrollY;
        });


    }
});