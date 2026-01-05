import { App } from 'obsidian';

export class MPConverter {
    private static app: App;

    static initialize(app: App) {
        this.app = app;
    }

    static formatContent(element: HTMLElement): void {
        // 创建 section 容器
        const section = document.createElement('section');
        section.className = 'mp-content-section';
        // 移动原有内容到 section 中
        while (element.firstChild) {
            section.appendChild(element.firstChild);
        }
        element.appendChild(section);

        // 处理元素
        this.processElements(section);

        // 将外部链接转换为文献引用（适配公众号不允许外链）
        this.convertExternalLinksToReferences(section);
    }

    private static isExternalHttpUrl(href: string): boolean {
        const trimmed = href.trim();
        return trimmed.startsWith('http://') || trimmed.startsWith('https://');
    }

    private static normalizeUrl(url: string): string {
        return url.trim();
    }

    private static convertExternalLinksToReferences(container: HTMLElement): void {
        if (!container) return;
        // Map: normalized url -> ref index
        const refIndexByUrl = new Map<string, number>();
        const refLabelByIndex = new Map<number, string>();
        const firstCiteAnchorByIndex = new Map<number, string>();
        const citeCountByIndex = new Map<number, number>();

        const anchors = Array.from(container.querySelectorAll('a[href]')) as HTMLAnchorElement[];
        let nextRefIndex = 1;

        for (const a of anchors) {
            const href = a.getAttribute('href');
            if (!href || !this.isExternalHttpUrl(href)) continue;
            const parent = a.parentNode;
            if (!parent) continue;

            const url = this.normalizeUrl(href);
            let refIndex = refIndexByUrl.get(url);
            if (!refIndex) {
                refIndex = nextRefIndex++;
                refIndexByUrl.set(url, refIndex);
                // 用首次出现的链接文本作为 label（为空则稍后回退到 url）
                const label = (a.textContent || '').trim();
                if (label) refLabelByIndex.set(refIndex, label);
            }

            const citeCount = (citeCountByIndex.get(refIndex) || 0) + 1;
            citeCountByIndex.set(refIndex, citeCount);
            const citeAnchorName = `mp-cite-${refIndex}-${citeCount}`;
            if (!firstCiteAnchorByIndex.has(refIndex)) {
                firstCiteAnchorByIndex.set(refIndex, citeAnchorName);
            }

            // 将 <a href="https://...">text</a>
            // 转换为：text<sup><a name="..."/> <a href="#mp-ref-N">[N]</a> <a href="#mp-ref-N">goto</a></sup>
            const replacement = document.createElement('span');
            while (a.firstChild) {
                replacement.appendChild(a.firstChild);
            }

            const sup = document.createElement('sup');

            const citeAnchor = document.createElement('a');
            citeAnchor.setAttribute('name', citeAnchorName);
            sup.appendChild(citeAnchor);

            const gotoRef1 = document.createElement('a');
            gotoRef1.setAttribute('href', `#mp-ref-${refIndex}`);
            gotoRef1.textContent = `[${refIndex}]`;
            sup.appendChild(gotoRef1);

            // Avoid Node.replaceWith for maximum compatibility.
            const fragment = document.createDocumentFragment();
            fragment.appendChild(replacement);
            fragment.appendChild(sup);
            parent.insertBefore(fragment, a);
            parent.removeChild(a);
        }

        if (refIndexByUrl.size === 0) return;

        // 追加参考文献区
        const refsHeading = document.createElement('h2');
        refsHeading.textContent = 'References';

        const refsList = document.createElement('ol');

        // 按 refIndex 顺序输出
        const urlByIndex: Array<{ index: number; url: string }> = [];
        for (const [url, index] of refIndexByUrl.entries()) {
            urlByIndex.push({ index, url });
        }
        urlByIndex.sort((a, b) => a.index - b.index);

        for (const { index, url } of urlByIndex) {
            const li = document.createElement('li');

            const refAnchor = document.createElement('a');
            refAnchor.setAttribute('name', `mp-ref-${index}`);
            li.appendChild(refAnchor);

            const label = refLabelByIndex.get(index) || url;
            li.appendChild(document.createTextNode(`${label} — ${url} `));

            const backTo = firstCiteAnchorByIndex.get(index);
            if (backTo) {
                const backLink = document.createElement('a');
                backLink.setAttribute('href', `#${backTo}`);
                backLink.textContent = '↩︎';
                li.appendChild(backLink);
            }

            refsList.appendChild(li);
        }

        container.appendChild(refsHeading);
        container.appendChild(refsList);
    }

    private static processElements(container: HTMLElement | null): void {
        if (!container) return;
        // 处理列表项内部元素，用section包裹
        container.querySelectorAll('li').forEach(li => {
            // 创建section元素
            const section = document.createElement('section');
            // 将li的所有子元素移动到section中
            while (li.firstChild) {
                section.appendChild(li.firstChild);
            }
            // 将section添加到li中
            li.appendChild(section);
        });

        // 处理代码块
        container.querySelectorAll('pre').forEach(pre => {
            // 过滤掉 frontmatter
            if (pre.classList.contains('frontmatter')) {
                // 如果是 frontmatter，直接移除整个元素
                pre.remove();
                return;
            }
            
            const codeEl = pre.querySelector('code');
            if (codeEl) {
                // 添加 macOS 风格的窗口按钮
                const header = document.createElement('div');
                header.className = 'mp-code-header';

                // 添加三个窗口按钮
                for (let i = 0; i < 3; i++) {
                    const dot = document.createElement('span');
                    dot.className = 'mp-code-dot';
                    header.appendChild(dot);
                }

                pre.insertBefore(header, pre.firstChild);
                
                // 移除原有的复制按钮
                const copyButton = pre.querySelector('.copy-code-button');
                if (copyButton) {
                    copyButton.remove();
                }
            }
        });

        // 处理图片
        container.querySelectorAll('span.internal-embed[alt][src]').forEach(async el => {
            const originalSpan = el as HTMLElement;
            const src = originalSpan.getAttribute('src');
            const alt = originalSpan.getAttribute('alt');
            
            if (!src) return;
            
            try {
                const linktext = src.split('|')[0];
                const file = this.app.metadataCache.getFirstLinkpathDest(linktext, '');
                if (file) {
                    const absolutePath = this.app.vault.adapter.getResourcePath(file.path);
                    const newImg = document.createElement('img');
                    newImg.src = absolutePath;
                    if (alt) newImg.alt = alt;
                    originalSpan.parentNode?.replaceChild(newImg, originalSpan);
                }
            } catch (error) {
                console.error('图片处理失败:', error);
            }
        });
    }
}