import { Notice } from 'obsidian';

export class CopyManager {
    private static readonly computedStyleProps = [
        'background',
        'background-color',
        'border',
        'border-color',
        'border-width',
        'border-style',
        'border-top',
        'border-right',
        'border-bottom',
        'border-left',
        'border-top-color',
        'border-right-color',
        'border-bottom-color',
        'border-left-color',
        'border-top-width',
        'border-right-width',
        'border-bottom-width',
        'border-left-width',
        'border-top-style',
        'border-right-style',
        'border-bottom-style',
        'border-left-style',
        'border-radius',
        'box-shadow',
        'padding',
        'padding-top',
        'padding-right',
        'padding-bottom',
        'padding-left',
        'margin',
        'margin-top',
        'margin-right',
        'margin-bottom',
        'margin-left',
        'color',
        'font-family',
        'font-size',
        'font-weight',
        'line-height',
        'text-align',
        'text-decoration',
        'white-space',
        'list-style',
        'list-style-position',
        'list-style-type',
        'display',
        'background-image',
        'background-clip',
        'background-position',
        'background-repeat',
        'background-size'
    ];

    private static cleanupHtml(element: HTMLElement): string {
        // 创建克隆以避免修改原始元素
        const clone = element.cloneNode(true) as HTMLElement;

        // 移除所有的 data-* 属性
        clone.querySelectorAll('*').forEach(el => {
            Array.from(el.attributes).forEach(attr => {
                if (attr.name.startsWith('data-')) {
                    el.removeAttribute(attr.name);
                }
            });
        });

        // 移除所有的 class 属性
        clone.querySelectorAll('*').forEach(el => {
            el.removeAttribute('class');
        });

        // 移除所有的 id 属性
        clone.querySelectorAll('*').forEach(el => {
            el.removeAttribute('id');
        });

        // 使用 XMLSerializer 安全地转换为字符串
        const serializer = new XMLSerializer();
        return serializer.serializeToString(clone);
    }

    private static inlineComputedStyles(source: HTMLElement, target: HTMLElement): void {
        const sourceNodes = [source, ...Array.from(source.querySelectorAll<HTMLElement>('*'))];
        const targetNodes = [target, ...Array.from(target.querySelectorAll<HTMLElement>('*'))];

        if (sourceNodes.length !== targetNodes.length) {
            console.warn('复制样式时节点数量不一致，可能导致样式缺失');
        }

        const count = Math.min(sourceNodes.length, targetNodes.length);
        for (let i = 0; i < count; i += 1) {
            const sourceEl = sourceNodes[i];
            const targetEl = targetNodes[i];
            const computed = window.getComputedStyle(sourceEl);

            this.computedStyleProps.forEach(prop => {
                if (targetEl.style.getPropertyValue(prop)) return;
                const value = computed.getPropertyValue(prop);
                if (value) {
                    targetEl.style.setProperty(prop, value);
                }
            });
        }
    }

    private static escapeHtml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    private static preserveCodeIndentation(container: HTMLElement): void {
        container.querySelectorAll('pre code').forEach(codeEl => {
            const raw = codeEl.textContent ?? '';
            const lines = raw.replace(/\t/g, '    ').split(/\r?\n/);
            const htmlLines = lines.map(line => {
                const leadingMatch = line.match(/^ +/);
                const leading = leadingMatch ? leadingMatch[0] : '';
                const rest = line.slice(leading.length);
                const escapedRest = this.escapeHtml(rest);
                const escapedLeading = leading.replace(/ /g, '&nbsp;');
                return `${escapedLeading}${escapedRest}`;
            });
            codeEl.innerHTML = htmlLines.join('<br>');
        });
    }

    private static applyCalloutFallbackStyles(source: HTMLElement, target: HTMLElement): void {
        const sourceCallouts = Array.from(source.querySelectorAll<HTMLElement>('.callout'));
        const targetCallouts = Array.from(target.querySelectorAll<HTMLElement>('.callout'));
        const count = Math.min(sourceCallouts.length, targetCallouts.length);

        for (let i = 0; i < count; i += 1) {
            const sourceCallout = sourceCallouts[i];
            const targetCallout = targetCallouts[i];
            const computed = window.getComputedStyle(sourceCallout);
            const calloutColor = computed.getPropertyValue('--callout-color').trim();
            const calloutBg = computed.getPropertyValue('--callout-background').trim();
            const calloutBorderWidth = computed.getPropertyValue('--callout-border-width').trim();
            const borderWidth = calloutBorderWidth || '4px';

            if (!targetCallout.style.borderLeft) {
                const borderColor = calloutColor || computed.borderLeftColor || '#d0d7de';
                targetCallout.style.borderLeft = `${borderWidth} solid ${borderColor}`;
            }

            if (!targetCallout.style.background && !targetCallout.style.backgroundColor) {
                const bgColor = calloutBg || computed.backgroundColor || '#f6f8fa';
                targetCallout.style.backgroundColor = bgColor;
            }

            if (!targetCallout.style.borderRadius && computed.borderRadius) {
                targetCallout.style.borderRadius = computed.borderRadius;
            }
        }
    }

    private static replaceCalloutsWithBlockquotes(source: HTMLElement, target: HTMLElement): void {
        const sourceCallouts = Array.from(source.querySelectorAll<HTMLElement>('.callout'));
        const targetCallouts = Array.from(target.querySelectorAll<HTMLElement>('.callout'));
        const count = Math.min(sourceCallouts.length, targetCallouts.length);

        for (let i = 0; i < count; i += 1) {
            const sourceCallout = sourceCallouts[i];
            const targetCallout = targetCallouts[i];
            const computed = window.getComputedStyle(sourceCallout);
            const calloutColor = computed.getPropertyValue('--callout-color').trim();
            const calloutBg = computed.getPropertyValue('--callout-background').trim();
            const calloutBorderWidth = computed.getPropertyValue('--callout-border-width').trim();
            const borderWidth = calloutBorderWidth || '4px';
            const borderColor = calloutColor || computed.borderLeftColor || '#3b82f6';
            const bgColor = calloutBg || computed.backgroundColor || 'rgba(59,130,246,0.08)';
            const borderRadius = computed.borderRadius || '8px';

            const titleEl = targetCallout.querySelector<HTMLElement>('.callout-title-inner');
            const contentEl = targetCallout.querySelector<HTMLElement>('.callout-content');

            const blockquote = document.createElement('blockquote');
            blockquote.setAttribute(
                'style',
                `margin: 1em 0; padding: 12px 14px; border-left: ${borderWidth} solid ${borderColor}; ` +
                `background: ${bgColor}; border-radius: ${borderRadius};`
            );

            if (titleEl?.textContent?.trim()) {
                const title = document.createElement('p');
                title.textContent = titleEl.textContent.trim();
                title.setAttribute('style', `margin: 0 0 6px 0; font-weight: 700; color: ${borderColor};`);
                blockquote.appendChild(title);
            }

            if (contentEl) {
                const contentWrap = document.createElement('div');
                contentWrap.innerHTML = contentEl.innerHTML;
                blockquote.appendChild(contentWrap);
            }

            targetCallout.replaceWith(blockquote);
        }
    }

    private static async blobToDataUrl(blob: Blob): Promise<string> {
        return await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    private static async svgToPngDataUrl(blob: Blob): Promise<string> {
        // 解析 SVG 获取合适的画布大小
        const svgText = await blob.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgText, 'image/svg+xml');
        const svg = doc.documentElement;

        let width = parseFloat(svg.getAttribute('width') || '');
        let height = parseFloat(svg.getAttribute('height') || '');

        // 如果没有宽高，尝试从 viewBox 中获取
        if ((!width || !height) && svg.getAttribute('viewBox')) {
            const viewBox = svg.getAttribute('viewBox')!.split(/\s+/);
            if (viewBox.length === 4) {
                width = parseFloat(viewBox[2]);
                height = parseFloat(viewBox[3]);
            }
        }

        // 兜底尺寸，避免 0 尺寸导致渲染失败
        if (!width || !height) {
            width = 1200;
            height = 800;
        }

        const serializedSvg = new XMLSerializer().serializeToString(svg);
        const url = URL.createObjectURL(new Blob([serializedSvg], { type: 'image/svg+xml' }));

        return await new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    URL.revokeObjectURL(url);
                    reject(new Error('Failed to create canvas context'));
                    return;
                }
                ctx.drawImage(image, 0, 0, width, height);
                const dataUrl = canvas.toDataURL('image/png');
                URL.revokeObjectURL(url);
                resolve(dataUrl);
            };
            image.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('Failed to render SVG to canvas'));
            };
            image.src = url;
        });
    }

    private static async processImages(container: HTMLElement): Promise<void> {
        const images = container.querySelectorAll('img');
        const imageArray = Array.from(images);
        
        for (const img of imageArray) {
            try {
                const response = await fetch(img.src);
                const blob = await response.blob();

                if (blob.type === 'image/svg+xml' || img.src.startsWith('data:image/svg+xml')) {
                    // 将 SVG（例如 Excalidraw 导出的）转换成 PNG，避免公众号不支持 SVG
                    const pngDataUrl = await this.svgToPngDataUrl(blob);
                    img.src = pngDataUrl;
                } else {
                    img.src = await this.blobToDataUrl(blob);
                }
            } catch (error) {
                console.error('图片转换失败:', error);
            }
        }
    }

    public static async copyToClipboard(element: HTMLElement): Promise<void> {
        try {
            const clone = element.cloneNode(true) as HTMLElement;
            await this.processImages(clone);

            const sourceSection = element.querySelector('.mp-content-section');
            const contentSection = clone.querySelector('.mp-content-section');
            if (!sourceSection || !contentSection) {
                throw new Error('找不到内容区域');
            }
            this.inlineComputedStyles(sourceSection as HTMLElement, contentSection as HTMLElement);
            this.applyCalloutFallbackStyles(sourceSection as HTMLElement, contentSection as HTMLElement);
            this.replaceCalloutsWithBlockquotes(sourceSection as HTMLElement, contentSection as HTMLElement);
            this.preserveCodeIndentation(contentSection as HTMLElement);
            // 使用新的 cleanupHtml 方法
            const cleanHtml = this.cleanupHtml(contentSection as HTMLElement);

            const clipData = new ClipboardItem({
                'text/html': new Blob([cleanHtml], { type: 'text/html' }),
                'text/plain': new Blob([clone.textContent || ''], { type: 'text/plain' })
            });

            await navigator.clipboard.write([clipData]);
            new Notice('已复制到剪贴板');
        } catch (error) {
            new Notice('复制失败');
        }
    }
}
