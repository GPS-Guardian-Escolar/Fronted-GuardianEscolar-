// Fetch every server page; never silently return only the first 20 records.
export async function collectPages(fetchPage) {
  const items = [];
  for (let page = 0; ; page += 1) {
    const data = await fetchPage(page);
    if (Array.isArray(data)) return data;
    if (!Array.isArray(data?.items)) throw new Error('Invalid paginated response');
    items.push(...data.items);
    if (data.last === true || data.items.length === 0 || !Number.isFinite(data.totalPages)
        || page + 1 >= data.totalPages) return items;
  }
}
