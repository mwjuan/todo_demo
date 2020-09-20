const debug = require('debug')('app');
const _ = require('lodash');

/**
 * 根据url query组装成pageable对象
 * ctx.state.pageable
 * 
 * opt.size
 * - 如果所有page的size都一致可以设置, 如果需要个性化size, 则无需设置，延迟到service中决定
 * 
 * page: >0, 1-based
 * size: >0
 * sort: foo,-bar
 * 
 * 
 * mongoose multiple sort:
 * sort({_id: -1, upvotes_count: -1})
 * criteria can be asc, desc, ascending, descending, 1, or -1
 * model.find({ ... }).sort({ field : criteria}).exec(function(err, model){ ... });

 * // equivalent
 * query.sort('field -test');
 */
module.exports = opt => {
	opt = opt || { page: 1, size: 100 };

	return async (ctx, next) => {
		let pageable = {};

		// page默认值为1
		let page = parseInt(ctx.query.page) || opt.page;

		// size ( 等于0: 返回page meta, 小于0: 分页大小infinite )
		let size = opt.size;
		if (parseInt(ctx.query.size) >= 0) size = parseInt(ctx.query.size);

		// 1-based
		if (typeof page === 'number' && !Number.isNaN(page) && page > 0) {
			pageable.page = page;
		}

		if (size !== null && typeof size === 'number' && !Number.isNaN(size)) {
			pageable.size = size;
		}

		if (ctx.query.sort) {
			pageable.sort = parseSort(ctx.query.sort);
		}
		ctx.state.pageable = pageable;
		return next();
	};
};

/**
 * 传入的内容无法解析或者是空时返回{}
 * foo, -bar
 */
let parseSort = sort => {
	if (!sort) return {};

	let sorters = sort.split(',');
	sorters = _.map(sorters, s => s.trim());

	let result = sorters.reduce(function (acc, item) {
		if (item === '' || item === '-') return acc;

		if (item.startsWith('-')) {
			acc[item.slice(1)] = -1;
		} else {
			acc[item] = 1;
		}
		return acc;
	}, {});
	return result;
};
