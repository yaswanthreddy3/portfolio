(function () {
    const root = document.documentElement;
    const header = document.querySelector("[data-header]");
    const navMenu = document.querySelector("[data-nav-menu]");
    const menuToggle = document.querySelector("[data-menu-toggle]");
    const themeToggle = document.querySelector("[data-theme-toggle]");
    const menuLabel = document.querySelector("[data-menu-label]");
    const yearTargets = document.querySelectorAll("[data-year]");
    const navLinks = navMenu ? navMenu.querySelectorAll("a") : [];
    const revealTargets = document.querySelectorAll("[data-reveal]");
    const blogPosts = document.getElementById("blogPosts");
    const blogStatus = document.getElementById("blogStatus");
    const blogRetry = document.getElementById("blogRetry");

    yearTargets.forEach((target) => {
        target.textContent = new Date().getFullYear();
    });

    const storedTheme = localStorage.getItem("theme");
    if (storedTheme === "light" || storedTheme === "dark") {
        root.dataset.theme = storedTheme;
    }

    function setMenu(open) {
        if (!menuToggle || !navMenu) return;
        menuToggle.setAttribute("aria-expanded", String(open));
        menuToggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
        if (menuLabel) menuLabel.textContent = open ? "Close" : "Menu";
        navMenu.classList.toggle("is-open", open);
        document.body.classList.toggle("menu-open", open);
    }

    function handleScroll() {
        const scrolled = window.scrollY > 16;
        if (header) header.classList.toggle("is-scrolled", scrolled);
    }

    function setActiveLink() {
        if (!navLinks.length) return;

        let activeId = "";
        document.querySelectorAll("main section[id]").forEach((section) => {
            const sectionTop = section.getBoundingClientRect().top;
            if (sectionTop <= 160) activeId = section.id;
        });

        navLinks.forEach((link) => {
            const href = link.getAttribute("href") || "";
            link.classList.toggle("is-active", href === `#${activeId}`);
        });
    }

    if (menuToggle) {
        menuToggle.addEventListener("click", () => {
            const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
            setMenu(!isOpen);
        });
    }

    navLinks.forEach((link) => {
        link.addEventListener("click", () => setMenu(false));
    });

    if (themeToggle) {
        themeToggle.addEventListener("click", () => {
            const currentTheme = root.dataset.theme || "light";
            const nextTheme = currentTheme === "dark" ? "light" : "dark";
            root.dataset.theme = nextTheme;
            localStorage.setItem("theme", nextTheme);
        });
    }

    if ("IntersectionObserver" in window) {
        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                    revealObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.14 });

        revealTargets.forEach((target) => revealObserver.observe(target));
    } else {
        revealTargets.forEach((target) => target.classList.add("is-visible"));
    }

    function stripHtml(html) {
        const doc = new DOMParser().parseFromString(html || "", "text/html");
        return doc.body.textContent || "";
    }

    function getImageUrl(item) {
        if (item.thumbnail) return item.thumbnail;
        if (item.enclosure && item.enclosure.url) return item.enclosure.url;

        const imageMatch = (item.content || "").match(/<img.*?src="(.*?)"/i);
        return imageMatch && imageMatch[1] ? imageMatch[1] : "";
    }

    function getInitials(title) {
        return (title || "YR")
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((word) => word[0])
            .join("")
            .toUpperCase();
    }

    function createPost(item) {
        const article = document.createElement("article");
        article.className = "post";

        const link = document.createElement("a");
        link.className = "post-card";
        link.href = item.link;
        link.target = "_blank";
        link.rel = "noopener noreferrer";

        const imageUrl = getImageUrl(item);
        if (imageUrl) {
            const image = document.createElement("img");
            image.className = "post-image";
            image.src = imageUrl;
            image.alt = item.title || "Medium blog post image";
            image.loading = "lazy";
            image.decoding = "async";
            link.appendChild(image);
        } else {
            const fallback = document.createElement("div");
            fallback.className = "post-image-fallback";
            fallback.textContent = getInitials(item.title);
            link.appendChild(fallback);
        }

        const body = document.createElement("div");
        body.className = "post-body";

        const title = document.createElement("h2");
        title.className = "post-title";
        title.textContent = item.title || "Untitled post";

        const snippet = document.createElement("p");
        snippet.className = "post-snippet";
        const cleanDescription = stripHtml(item.description).replace(/\s+/g, " ").trim();
        snippet.textContent = cleanDescription.length > 150
            ? `${cleanDescription.slice(0, 150)}...`
            : cleanDescription || "Read the full post on Medium.";

        const date = document.createElement("p");
        date.className = "post-date";
        const parsedDate = new Date(item.pubDate);
        date.textContent = Number.isNaN(parsedDate.getTime())
            ? "Published on Medium"
            : parsedDate.toDateString();

        body.append(title, snippet, date);
        link.appendChild(body);
        article.appendChild(link);

        return article;
    }

    async function fetchMediumPosts() {
        if (!blogPosts || !blogStatus) return;

        const rssFeed = "https://medium.com/feed/@yaswanthreddy3775";
        const endpoint = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssFeed)}&cache_bust=${Date.now()}`;

        blogPosts.setAttribute("aria-busy", "true");
        blogStatus.textContent = "Loading latest posts...";
        if (blogRetry) blogRetry.hidden = true;

        try {
            const response = await fetch(endpoint);
            const data = await response.json();

            if (data.status !== "ok" || !Array.isArray(data.items)) {
                throw new Error("Failed to fetch RSS feed");
            }

            blogPosts.innerHTML = "";
            data.items.forEach((item) => blogPosts.appendChild(createPost(item)));
            blogPosts.setAttribute("aria-busy", "false");
            blogStatus.textContent = "Posts loaded";
        } catch (error) {
            blogPosts.innerHTML = "";
            blogPosts.setAttribute("aria-busy", "false");
            blogStatus.textContent = "Failed to load blog posts. Please try again later.";
            if (blogRetry) blogRetry.hidden = false;
        }
    }

    if (blogPosts) {
        fetchMediumPosts();
        window.setInterval(fetchMediumPosts, 300000);
    }

    if (blogRetry) {
        blogRetry.addEventListener("click", fetchMediumPosts);
    }

    window.addEventListener("scroll", () => {
        handleScroll();
        setActiveLink();
    }, { passive: true });

    window.addEventListener("keydown", (event) => {
        if (event.key === "Escape") setMenu(false);
    });

    handleScroll();
    setActiveLink();
})();
